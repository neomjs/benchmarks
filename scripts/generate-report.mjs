import fs     from 'fs-extra';
import path   from 'path';
import {glob} from 'glob';

const args = process.argv.slice(2);
const frameworkArg = args.find(arg => arg.startsWith('--framework='));
const framework = frameworkArg ? frameworkArg.split('=')[1] : 'all';

const RESULTS_DIR = path.resolve(process.cwd(), `test-results-data-${framework}`);
const OUTPUT_PATH = path.resolve(process.cwd(), framework === 'all' ? 'BENCHMARK_RESULTS.md' : `BENCHMARK_RESULTS_${framework.toUpperCase()}.md`);
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
                    const benchmarkName = spec.title.replace(/^(Neo\.mjs|React) benchmark: /, '');

                    if (!benchmarkName) {
                        return;
                    }

                    if (benchmarkName.endsWith(RESPONSIVENESS_TEST_SUFFIX)) {
                        initializeBenchmark(responsivenessBenchmarks, benchmarkName);
                    } else {
                        initializeBenchmark(durationBenchmarks, benchmarkName);
                    }

                    spec.tests.forEach(test => {
                        const mode = test.projectName.endsWith('-dev') ? 'dev' : 'prod';
                        const browser = BROWSERS.find(b => test.projectName.startsWith(b));

                        if (browser && test.results.every(r => r.status === 'passed')) {
                            if (benchmarkName.endsWith(RESPONSIVENESS_TEST_SUFFIX)) {
                                const fpsAnnotation = test.annotations.find(a => a.type === 'averageFps');
                                const longFrameAnnotation = test.annotations.find(a => a.type === 'longFrameCount');
                                const target = responsivenessBenchmarks[benchmarkName][mode][browser];

                                if (fpsAnnotation && longFrameAnnotation) {
                                    target.fps = (target.fps || []).concat(parseFloat(fpsAnnotation.description));
                                    target.longFrames = (target.longFrames || []).concat(parseFloat(longFrameAnnotation.description));
                                }
                            } else {
                                const durationAnnotation = test.annotations.find(a => a.type === 'duration');
                                if (durationAnnotation) {
                                    const duration = parseFloat(durationAnnotation.description);
                                    const target = durationBenchmarks[benchmarkName][mode][browser];
                                    target.times = (target.times || []).concat(duration);
                                }
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
                        if (result.times.length > 0) {
                            result.avg = result.times.reduce((a, b) => a + b, 0) / result.times.length;
                            result.stdDev = getStandardDeviation(result.times);
                        }
                    }
                    if (result.fps) { // Responsiveness benchmarks
                        if (result.fps.length > 0) {
                            result.avgFps = result.fps.reduce((a, b) => a + b, 0) / result.fps.length;
                            result.stdDevFps = getStandardDeviation(result.fps);
                            result.avgLongFrames = result.longFrames.reduce((a, b) => a + b, 0) / result.longFrames.length;
                            result.stdDevLongFrames = getStandardDeviation(result.longFrames);
                        }
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
    let table = `| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |
|---------------------------|------------|---------------|----------------|-------------|
`;
    const sortedKeys = Object.keys(benchmarks).sort();

    for (const key of sortedKeys) {
        const result = benchmarks[key];
        table += `| **${key}**               |            |               |                |             |
`;

        let totalDevAvg = 0, totalProdAvg = 0, browserCount = 0;

        BROWSERS.forEach(browser => {
            const devResult = result.dev[browser];
            const prodResult = result.prod[browser];
            if (!devResult.times || devResult.times.length === 0) return;

            browserCount++;
            totalDevAvg += devResult.avg;
            totalProdAvg += prodResult.avg;

            const devAvg = `${devResult.avg.toFixed(2)} (±${devResult.stdDev.toFixed(2)})`;
            const prodAvg = `${prodResult.avg.toFixed(2)} (±${prodResult.stdDev.toFixed(2)})`;
            let improvement = 'N/A';
            if (devResult.avg > 0 && prodResult.avg > 0) {
                const percentage = ((devResult.avg - prodResult.avg) / devResult.avg) * 100;
                improvement = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
            }
            table += `|                           | ${browser.padEnd(10)} | ${devAvg.padEnd(13)} | ${prodAvg.padEnd(14)} | ${improvement.padEnd(11)} |
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
        }
        table += `|---------------------------|------------|---------------|----------------|-------------|
`;
    }
    return table;
}

/**
 * Generates the markdown for the responsiveness benchmarks.
 * @param {Object} benchmarks The structured responsiveness benchmark data.
 * @returns {String} The markdown table as a string.
 */
function generateResponsivenessMarkdown(benchmarks) {
    let table = `| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
`;
    const sortedKeys = Object.keys(benchmarks).sort();

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
 * Main function to run the script.
 */
async function main() {
    try {
        const resultFiles = glob.sync(
`${RESULTS_DIR}/*.json`
);
        if (resultFiles.length === 0) {
            console.error(`Error: No result files found in ${RESULTS_DIR}. Please run the tests first.`);
            process.exit(1);
        }

        const allRunsData = await Promise.all(resultFiles.map(file => fs.readJson(file)));

        const { durationBenchmarks, responsivenessBenchmarks } = parseResults(allRunsData);

        const durationTable = generateDurationMarkdown(durationBenchmarks, resultFiles.length);
        const responsivenessTable = generateResponsivenessMarkdown(responsivenessBenchmarks);

        const devPath = '`/apps/benchmarks/`';
        const prodPath = '`/dist/production/apps/benchmarks/`';

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
---

*This file is auto-generated. Do not edit manually.*
`;
        await fs.writeFile(OUTPUT_PATH, markdown);

        console.log(
`Successfully generated benchmark report at: ${OUTPUT_PATH}`
);
    } catch (error) {
        console.error('Failed to generate benchmark report:', error);
        process.exit(1);
    }
}

main();