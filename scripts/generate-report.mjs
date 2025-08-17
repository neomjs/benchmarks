import fs     from 'fs-extra';
import path   from 'path';
import {glob} from 'glob';

const args = process.argv.slice(2);
const frameworkArg = args.find(arg => arg.startsWith('--framework='));
const framework = frameworkArg ? frameworkArg.split('=')[1] : 'all';

const DATA_DIRS_PATTERN = path.resolve(process.cwd(), 'test-results-data', framework, '*');
const OUTPUT_PATH = path.resolve(process.cwd(), `BENCHMARK_RESULTS_${framework.toUpperCase()}.md`);
const BROWSERS = ['chromium', 'firefox', 'webkit'];
const RESPONSIVENESS_TEST_SUFFIX = 'UI Responsiveness';

/**
 * Calculates the standard deviation of an array of numbers.
 * @param {number[]} arr The array of numbers.
 * @returns {number} The standard deviation.
 */
function getStandardDeviation(arr) {
    if (arr.length < 2) return 0;
    const n = arr.length;
    const mean = arr.reduce((a, b) => a + b) / n;
    return Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}

/**
 * Initializes a nested object for a given benchmark name and browser.
 * @param {Object} collection The collection to initialize.
 * @param {String} name The name of the benchmark.
 */
function initializeBenchmark(collection, name) {
    if (!collection[name]) {
        collection[name] = { dev: {}, prod: {} };
        BROWSERS.forEach(browser => {
            collection[name].dev[browser] = {};
            collection[name].prod[browser] = {};
        });
    }
}

/**
 * Parses raw JSON data from multiple Playwright reports and aggregates it.
 * @param {Object[]} allRunsData An array of raw JSON data objects.
 * @returns {{durationBenchmarks: Object, responsivenessBenchmarks: Object}}
 */
function parseResults(allRunsData) {
    const durationBenchmarks = {};
    const responsivenessBenchmarks = {};

    allRunsData.forEach(runData => {
        const processSuite = (suite) => {
            if (suite.specs) {
                suite.specs.forEach(spec => {
                    const benchmarkName = spec.title.replace(/^(Neo\.mjs|React|Angular) benchmark: /, '');

                    if (!benchmarkName) {
                        return;
                    }

                    spec.tests.forEach(test => {
                        const mode = test.projectName.endsWith('-dev') ? 'dev' : 'prod';
                        const browser = BROWSERS.find(b => test.projectName.startsWith(b));

                        if (browser) {
                            if (benchmarkName.endsWith(RESPONSIVENESS_TEST_SUFFIX)) {
                                initializeBenchmark(responsivenessBenchmarks, benchmarkName);
                                if (test.results.every(r => r.status === 'passed')) { // Keep status check for responsiveness
                                    const fpsAnnotation = test.annotations.find(a => a.type === 'averageFps');
                                    const longFrameAnnotation = test.annotations.find(a => a.type === 'longFrameCount');

                                    // New scrolling metrics annotations
                                    const avgTimeToValidStateAnnotation = test.annotations.find(a => a.type === 'avgTimeToValidState');
                                    const maxTimeToValidStateAnnotation = test.annotations.find(a => a.type === 'maxTimeToValidState');
                                    const updateSuccessRateAnnotation = test.annotations.find(a => a.type === 'updateSuccessRate');

                                    const target = responsivenessBenchmarks[benchmarkName][mode][browser];

                                    if (fpsAnnotation && longFrameAnnotation) {
                                        target.fps = (target.fps || []).concat(parseFloat(fpsAnnotation.description));
                                        target.longFrames = (target.longFrames || []).concat(parseFloat(longFrameAnnotation.description));
                                    }

                                    // Aggregate new scrolling metrics
                                    if (avgTimeToValidStateAnnotation && maxTimeToValidStateAnnotation && updateSuccessRateAnnotation) {
                                        target.avgTimeToValidState = (target.avgTimeToValidState || []).concat(parseFloat(avgTimeToValidStateAnnotation.description));
                                        target.maxTimeToValidState = (target.maxTimeToValidState || []).concat(parseFloat(maxTimeToValidStateAnnotation.description));
                                        target.updateSuccessRate = (target.updateSuccessRate || []).concat(parseFloat(updateSuccessRateAnnotation.description));
                                    }
                                }
                            } else {
                                test.annotations.forEach(annotation => {
                                    if (annotation.type === 'performance') {
                                        try {
                                            const performanceData = JSON.parse(annotation.description);
                                            for (const [name, duration] of Object.entries(performanceData)) {
                                                if (duration === null) continue; // Skip null durations (e.g., N/A UI updates)
                                                initializeBenchmark(durationBenchmarks, name);
                                                const target = durationBenchmarks[name][mode][browser];
                                                target.times = (target.times || []).concat(parseFloat(duration));
                                            }
                                        } catch (e) {
                                            console.error(`Error parsing performance annotation for spec "${spec.title}":`, e);
                                        }
                                    }
                                });
                            }
                        }
                    });
                });
            }
            if (suite.suites) {
                suite.suites.forEach(processSuite);
            }
        };
        runData.suites.forEach(processSuite);
    });

    // Calculate averages and standard deviations for both collections
    [durationBenchmarks, responsivenessBenchmarks].forEach(collection => {
        for (const benchmarkName in collection) {
            const benchmark = collection[benchmarkName];
            BROWSERS.forEach(browser => {
                ['dev', 'prod'].forEach(mode => {
                    const result = benchmark[mode][browser];
                    if (result.times) { // Duration benchmarks
                        const validTimes = result.times.filter(t => Number.isFinite(t));
                        if (validTimes.length > 0) {
                            result.avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
                            result.stdDev = getStandardDeviation(validTimes);
                        } else if (result.times.some(t => t === Infinity)) {
                            result.avg = Infinity; // Indicate all runs were timeouts
                            result.stdDev = 0; // No std dev for timeouts
                        }
                    }
                    if (result.fps) { // Responsiveness benchmarks (old FPS/LongFrames)
                        if (result.fps.length > 0) {
                            result.avgFps = result.fps.reduce((a, b) => a + b, 0) / result.fps.length;
                            result.stdDevFps = getStandardDeviation(result.fps);
                            result.avgLongFrames = result.longFrames.reduce((a, b) => a + b, 0) / result.longFrames.length;
                            result.stdDevLongFrames = getStandardDeviation(result.longFrames);
                        }
                    }
                    // New scrolling metrics calculations
                    if (result.avgTimeToValidState && result.avgTimeToValidState.length > 0) {
                        result.avgTimeToValidStateAvg = result.avgTimeToValidState.reduce((a, b) => a + b, 0) / result.avgTimeToValidState.length;
                        result.avgTimeToValidStateStdDev = getStandardDeviation(result.avgTimeToValidState);
                    }
                    if (result.maxTimeToValidState && result.maxTimeToValidState.length > 0) {
                        result.maxTimeToValidStateAvg = result.maxTimeToValidState.reduce((a, b) => a + b, 0) / result.maxTimeToValidState.length;
                        result.maxTimeToValidStateStdDev = getStandardDeviation(result.maxTimeToValidState);
                    }
                    if (result.updateSuccessRate && result.updateSuccessRate.length > 0) {
                        result.updateSuccessRateAvg = result.updateSuccessRate.reduce((a, b) => a + b, 0) / result.updateSuccessRate.length;
                        result.updateSuccessRateStdDev = getStandardDeviation(result.updateSuccessRate);
                    }
                });
            });
        }
    });

    return { durationBenchmarks, responsivenessBenchmarks };
}

/**
 * Generates the markdown for the duration-based benchmarks.
 * @param {Object} benchmarks The structured duration benchmark data.
 * @param {number} runCount The number of runs the data was aggregated from.
 * @returns {String} The markdown table as a string.
 */
function generateDurationMarkdown(benchmarks, runCount) {
    let table = `| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |\n|---------------------------|------------|---------------|----------------|-------------|\n`;
    const sortedKeys = Object.keys(benchmarks).sort();

    for (const key of sortedKeys) {
        const result = benchmarks[key];
        table += `| **${key}**               |            |               |                |             |\n`;

        let totalDevAvg = 0, totalProdAvg = 0, browserCount = 0;

        BROWSERS.forEach(browser => {
            const devResult = result.dev[browser];
            const prodResult = result.prod[browser];

            const hasDevData = devResult.times && devResult.times.length > 0;
            const hasProdData = prodResult.times && prodResult.times.length > 0;

            if (!hasDevData && !hasProdData) return; // No data for this browser

            let devAvgFormatted, prodAvgFormatted, improvement;

            if (devResult.avg === Infinity) {
                devAvgFormatted = 'Timeout'.padEnd(13);
            } else if (Number.isFinite(devResult.avg)) {
                devAvgFormatted = `${devResult.avg.toFixed(2)} (±${devResult.stdDev.toFixed(2)})`.padEnd(13);
            } else {
                devAvgFormatted = 'N/A'.padEnd(13);
            }

            if (prodResult.avg === Infinity) {
                prodAvgFormatted = 'Timeout'.padEnd(14);
            } else if (Number.isFinite(prodResult.avg)) {
                prodAvgFormatted = `${prodResult.avg.toFixed(2)} (±${prodResult.stdDev.toFixed(2)})`.padEnd(14);
            } else {
                prodAvgFormatted = 'N/A'.padEnd(14);
            }

            if (Number.isFinite(devResult.avg) && Number.isFinite(prodResult.avg) && devResult.avg > 0 && prodResult.avg > 0) {
                const percentage = ((devResult.avg - prodResult.avg) / devResult.avg) * 100;
                improvement = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`.padEnd(11);
            } else {
                improvement = 'N/A'.padEnd(11);
            }

            if (Number.isFinite(devResult.avg) && Number.isFinite(prodResult.avg)) {
                browserCount++;
                totalDevAvg += devResult.avg;
                totalProdAvg += prodResult.avg;
            }

            table += `|                           | ${browser.padEnd(10)} | ${devAvgFormatted} | ${prodAvgFormatted} | ${improvement} |
`;
        });

        if (browserCount > 0) {
            const devAvgAll = totalDevAvg / browserCount;
            const prodAvgAll = totalProdAvg / browserCount;
            let improvementAll = 'N/A';
            if (devAvgAll > 0 && prodAvgAll > 0) {
                const percentage = ((devAvgAll - prodAvgAll) / devAvgAll) * 100;
                improvementAll = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
            }
            table += `|                           | **Average**| **${devAvgAll.toFixed(2)}**        | **${prodAvgAll.toFixed(2)}**         | **${improvementAll}**    |
`;
        } else {
            // If all runs were timeouts or N/A, display Timeout for average
            table += `|                           | **Average**| **Timeout**        | **Timeout**         | **N/A**    |
`;
        }
        table += `|---------------------------|------------|---------------|----------------|-------------|
`;
    }
    return table;
}

/**
 * Generates the markdown for the responsiveness benchmarks.
 * @param {Object} benchmarks The structured responsiveness benchmark data.
 * @param {number} runCount The number of runs the data was aggregated from.
 * @returns {String} The markdown table as a string.
 */
function generateResponsivenessMarkdown(benchmarks) {
    let table = `| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
`;
    const sortedKeys = Object.keys(benchmarks)
        .filter(key => {
            const result = benchmarks[key];
            // Exclude benchmarks that have scrolling fluidity data
            return !BROWSERS.some(browser =>
                (result.dev[browser].avgTimeToValidStateAvg && Number.isFinite(result.dev[browser].avgTimeToValidStateAvg)) ||
                (result.prod[browser].avgTimeToValidStateAvg && Number.isFinite(result.prod[browser].avgTimeToValidStateAvg))
            );
        })
        .sort();

    for (const key of sortedKeys) {
        const result = benchmarks[key];
        const shortKey = key.replace(RESPONSIVENESS_TEST_SUFFIX, '').trim();
        table += `| **${shortKey}**                            |            |                              |                               |
`;

        BROWSERS.forEach(browser => {
            const devResult = result.dev[browser];
            const prodResult = result.prod[browser];
            if (!devResult.fps || devResult.fps.length === 0) return;

            const devAvg =
`${devResult.avgFps.toFixed(1)} (±${devResult.stdDevFps.toFixed(1)}) / ${devResult.avgLongFrames.toFixed(1)} (±${devResult.stdDevLongFrames.toFixed(1)})`;
            const prodAvg =
`${prodResult.avgFps.toFixed(1)} (±${prodResult.stdDevFps.toFixed(1)}) / ${prodResult.avgLongFrames.toFixed(1)} (±${prodResult.stdDevLongFrames.toFixed(1)})`;

            table += `|                                             | ${browser.padEnd(10)} | ${devAvg.padEnd(28)} | ${prodAvg.padEnd(29)} |
`;
        });
        table += `|---------------------------------------------|------------|------------------------------|-------------------------------|
`;
    }
    return table;
}

/**
 * Generates the markdown for the scrolling fluidity benchmarks.
 * @param {Object} benchmarks The structured responsiveness benchmark data.
 * @returns {String} The markdown table as a string.
 */
function generateScrollingFluidityMarkdown(benchmarks) {
    let table = `| Benchmark                                   | Browser    | Dev Mode (Avg Time to Valid State / Max Time to Valid State) | Dev Mode (Update Success Rate) | Prod Mode (Avg Time to Valid State / Max Time to Valid State) | Prod Mode (Update Success Rate) |
|---------------------------------------------|------------|--------------------------------------------------------------|--------------------------------|---------------------------------------------------------------|---------------------------------|
`;
    const sortedKeys = Object.keys(benchmarks)
        .filter(key => {
            const result = benchmarks[key];
            // Check if there's any scrolling data for any browser in either dev or prod mode
            return BROWSERS.some(browser =>
                (result.dev[browser].avgTimeToValidStateAvg && Number.isFinite(result.dev[browser].avgTimeToValidStateAvg)) ||
                (result.prod[browser].avgTimeToValidStateAvg && Number.isFinite(result.prod[browser].avgTimeToValidStateAvg))
            ); // Filter for tests that actually have scrolling data
        })
        .sort();

    if (sortedKeys.length === 0) {
        // Return the empty table structure if no data is present
        return table;
    }

    for (const key of sortedKeys) {
        const result = benchmarks[key];
        const shortKey = key.replace(RESPONSIVENESS_TEST_SUFFIX, '').trim();
        table += `| **${shortKey}**                            |            |                                                              |                                |                                                               |                                 |
`;

        BROWSERS.forEach(browser => {
            const devResult = result.dev[browser];
            const prodResult = result.prod[browser];

            let devAvgTimeToValidStateFormatted = 'N/A';
            let devMaxTimeToValidStateFormatted = 'N/A';
            let devUpdateSuccessRateFormatted = 'N/A';

            if (devResult.avgTimeToValidStateAvg && Number.isFinite(devResult.avgTimeToValidStateAvg)) {
                devAvgTimeToValidStateFormatted = `${devResult.avgTimeToValidStateAvg.toFixed(2)} (±${devResult.avgTimeToValidStateStdDev.toFixed(2)})`;
                devMaxTimeToValidStateFormatted = `${devResult.maxTimeToValidStateAvg.toFixed(2)} (±${devResult.maxTimeToValidStateStdDev.toFixed(2)})`;
                devUpdateSuccessRateFormatted = `${devResult.updateSuccessRateAvg.toFixed(2)} (±${devResult.updateSuccessRateStdDev.toFixed(2)})%`;
            }

            let prodAvgTimeToValidStateFormatted = 'N/A';
            let prodMaxTimeToValidStateFormatted = 'N/A';
            let prodUpdateSuccessRateFormatted = 'N/A';

            if (prodResult.avgTimeToValidStateAvg && Number.isFinite(prodResult.avgTimeToValidStateAvg)) {
                prodAvgTimeToValidStateFormatted = `${prodResult.avgTimeToValidStateAvg.toFixed(2)} (±${prodResult.avgTimeToValidStateStdDev.toFixed(2)})`;
                prodMaxTimeToValidStateFormatted = `${prodResult.maxTimeToValidStateAvg.toFixed(2)} (±${prodResult.maxTimeToValidStateStdDev.toFixed(2)})`;
                prodUpdateSuccessRateFormatted = `${prodResult.updateSuccessRateAvg.toFixed(2)} (±${prodResult.updateSuccessRateStdDev.toFixed(2)})%`;
            }

            table += `|                                             | ${browser.padEnd(10)} | ${devAvgTimeToValidStateFormatted.padEnd(60)} | ${devUpdateSuccessRateFormatted.padEnd(30)} | ${prodAvgTimeToValidStateFormatted.padEnd(61)} | ${prodUpdateSuccessRateFormatted.padEnd(31)} |
`;
        });
        table += `|---------------------------------------------|------------|--------------------------------------------------------------|--------------------------------|---------------------------------------------------------------|---------------------------------|
`;
    }
    return table;
}



/**
 * Generates the markdown for the browser versions.
 * @param {Object} browserInfo The collected browser information from custom reporter.
 * @returns {String} The markdown table as a string.
 */
function generateBrowserVersionsMarkdown(browserInfo) {
    let table = `## Browser Versions

| Browser    | Version     |
|------------|-------------|
`;
    if (browserInfo.chrome) {
        table += `| Chrome     | ${browserInfo.chrome.padEnd(11)} |
`;
    }
    if (browserInfo.firefox) {
        table += `| Firefox    | ${browserInfo.firefox.padEnd(11)} |
`;
    }
    if (browserInfo.safari) {
        table += `| Safari     | ${browserInfo.safari.padEnd(11)} |
`;
    }
    // Add other browsers if needed
    return table;
}

/**
 * Generates the markdown for the system information.
 * @param {Object} benchmarkSystemInfo The system information collected by custom reporter.
 * @returns {String} The markdown table as a string.
 */
function generateSystemInfoMarkdown(benchmarkSystemInfo) {
    let table = `## System Information

| Property   | Value       |
|------------|-------------|
`;
    if (benchmarkSystemInfo.os) {
        table += `| OS Name    | ${benchmarkSystemInfo.os.padEnd(11)} |
`;
    }
    if (benchmarkSystemInfo.osVersion) {
        table += `| OS Version | ${benchmarkSystemInfo.osVersion.padEnd(11)} |
`;
    }
    if (benchmarkSystemInfo.totalMemory) {
        table += `| Total RAM  | ${benchmarkSystemInfo.totalMemory}GB |
`;
    }
    if (benchmarkSystemInfo.cpuCores) {
        table += `| CPU Cores  | ${benchmarkSystemInfo.cpuCores} |
`;
    }
    if (benchmarkSystemInfo.nodeVersion) {
        table += `| Node.js    | ${benchmarkSystemInfo.nodeVersion.padEnd(11)} |
`;
    }
    if (benchmarkSystemInfo.playwrightVersion) {
        table += `| Playwright | ${benchmarkSystemInfo.playwrightVersion.padEnd(11)} |
`;
    }

    if (benchmarkSystemInfo.platform) {
        table += `| Platform   | ${benchmarkSystemInfo.platform.padEnd(11)} |
`;
    }
    if (benchmarkSystemInfo.arch) {
        table += `| Architecture | ${benchmarkSystemInfo.arch.padEnd(11)} |
`;
    }
    return table;
}

/**
 * Generates the markdown for known issues.
 * @returns {String} The markdown table as a string.
 */
function generateKnownIssuesMarkdown() {
    let markdown = `## Known Issues

`;
    markdown += `- **React benchmark: Create 1M rows (Firefox)**: This test is skipped for Firefox due to known Out-of-Memory issues when attempting to render 1 million rows.
`;
    return markdown;
}

/**
 * Main function to run the script.
 */
async function main() {
    try {
        const RESULTS_DIR = path.resolve(process.cwd(), 'test-results-data', framework);
        const resultFiles = glob.sync(`${RESULTS_DIR}/**/*.json`);
        if (resultFiles.length === 0) {
            console.error(`Error: No result files found in ${RESULTS_DIR}. Please run the tests first.`);
            process.exit(1);
        }

        const allRunsData = await Promise.all(resultFiles.map(file => fs.readJson(file)));

        let benchmarkSystemInfo = {};
        const systemInfoFilePath = 'benchmark-system-info.json';
        if (fs.existsSync(systemInfoFilePath)) {
            try {
                benchmarkSystemInfo = JSON.parse(fs.readFileSync(systemInfoFilePath, 'utf8'));
            } catch (e) {
                console.warn('Failed to parse systemInfo from file:', e);
            }
        }

        const { durationBenchmarks, responsivenessBenchmarks } = parseResults(allRunsData);

        const durationTable        = generateDurationMarkdown(durationBenchmarks, resultFiles.length);
        const responsivenessTable  = generateResponsivenessMarkdown(responsivenessBenchmarks);
        const scrollingFluidityTable = generateScrollingFluidityMarkdown(responsivenessBenchmarks);
        const browserVersionsTable = generateBrowserVersionsMarkdown(benchmarkSystemInfo.browsers);
        const systemInfoTable      = generateSystemInfoMarkdown(benchmarkSystemInfo);
        const knownIssuesMarkdown  = generateKnownIssuesMarkdown();
        const devPath              = '`/apps/benchmarks/`';
        const prodPath             = '`/dist/production/apps/benchmarks/`';

        const markdown = `# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (${devPath}).
- **Production Mode**: Using the optimized build output (${prodPath}).

The data is aggregated over **${resultFiles.length} run(s)**. The value in parentheses (±) is the standard deviation.

## Duration Benchmarks

This table shows the average execution time in milliseconds (ms). Lower is better.

${durationTable}

## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

${responsivenessTable}

## Scrolling Fluidity Benchmarks

This table shows metrics related to how smoothly content updates during a scroll. For all metrics, lower is better.

${scrollingFluidityTable}

${browserVersionsTable}

${systemInfoTable}

${knownIssuesMarkdown}
---

*This file is auto-generated. Do not edit manually.*
`;
        await fs.writeFile(OUTPUT_PATH, markdown);

        console.log(`Successfully generated benchmark report at: ${OUTPUT_PATH}`);
    } catch (error) {
        console.error('Failed to generate benchmark report:', error);
        process.exit(1);
    }
}

main();
