import fs     from 'fs-extra';
import path   from 'path';
import {glob} from 'glob';

const RESULTS_DIR = path.resolve(process.cwd(), 'test-results-data');
const OUTPUT_PATH = path.resolve(process.cwd(), 'BENCHMARK_RESULTS.md');
const BROWSERS = ['chromium', 'firefox', 'webkit'];

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
 * Parses raw JSON data from multiple Playwright reports and aggregates it.
 * @param {Object[]} allRunsData An array of raw JSON data objects.
 * @returns {Object} A structured object with aggregated benchmark results.
 */
function parseResults(allRunsData) {
    const benchmarks = {};

    const initializeBenchmark = (name) => {
        if (!benchmarks[name]) {
            benchmarks[name] = { dev: {}, prod: {} };
            BROWSERS.forEach(browser => {
                benchmarks[name].dev[browser] = { times: [], avg: 0, stdDev: 0 };
                benchmarks[name].prod[browser] = { times: [], avg: 0, stdDev: 0 };
            });
        }
    };

    allRunsData.forEach(runData => {
        const processSuite = (suite) => {
            if (suite.specs) {
                suite.specs.forEach(spec => {
                    const benchmarkName = spec.title.replace('Neo.mjs benchmark: ', '');
                    initializeBenchmark(benchmarkName);

                    spec.tests.forEach(test => {
                        const mode = test.projectName.endsWith('-dev') ? 'dev' : 'prod';
                        const browser = BROWSERS.find(b => test.projectName.startsWith(b));

                        if (browser && test.results.every(r => r.status === 'passed')) {
                            const durationAnnotation = test.annotations.find(a => a.type === 'duration');
                            if (durationAnnotation) {
                                const duration = parseFloat(durationAnnotation.description);
                                benchmarks[benchmarkName][mode][browser].times.push(duration);
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

    // Calculate averages and standard deviations
    for (const benchmarkName in benchmarks) {
        const benchmark = benchmarks[benchmarkName];
        BROWSERS.forEach(browser => {
            const devResult = benchmark.dev[browser];
            if (devResult.times.length > 0) {
                devResult.avg = devResult.times.reduce((a, b) => a + b, 0) / devResult.times.length;
                devResult.stdDev = getStandardDeviation(devResult.times);
            }
            const prodResult = benchmark.prod[browser];
            if (prodResult.times.length > 0) {
                prodResult.avg = prodResult.times.reduce((a, b) => a + b, 0) / prodResult.times.length;
                prodResult.stdDev = getStandardDeviation(prodResult.times);
            }
        });
    }

    return benchmarks;
}

/**
 * Generates the markdown content for the results file.
 * @param {Object} benchmarks The structured benchmark data.
 * @param {number} runCount The number of runs the data was aggregated from.
 * @returns {String} The markdown content as a string.
 */
function generateMarkdown(benchmarks, runCount) {
    let table = `| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |
|---------------------------|------------|---------------|----------------|-------------|
`;

    const sortedKeys = Object.keys(benchmarks).sort();

    for (const key of sortedKeys) {
        const result = benchmarks[key];
        table += `| **${key}**               |            |               |                |             |\n`;

        let totalDevAvg = 0, totalProdAvg = 0, browserCount = 0;

        BROWSERS.forEach(browser => {
            const devResult = result.dev[browser];
            const prodResult = result.prod[browser];
            if (devResult.times.length === 0 && prodResult.times.length === 0) return;

            browserCount++;
            totalDevAvg += devResult.avg;
            totalProdAvg += prodResult.avg;

            const devAvg =
`${devResult.avg.toFixed(2)} (±${devResult.stdDev.toFixed(2)})`;
            const prodAvg =
`${prodResult.avg.toFixed(2)} (±${prodResult.stdDev.toFixed(2)})`;
            let improvement = 'N/A';
            if (devResult.avg > 0 && prodResult.avg > 0) {
                const percentage = ((devResult.avg - prodResult.avg) / devResult.avg) * 100;
                improvement = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
            }
            table += `|                           | ${browser.padEnd(10)} | ${devAvg.padEnd(13)} | ${prodAvg.padEnd(14)} | ${improvement.padEnd(11)} |\n`;
        });

        const devAvgAll = totalDevAvg / browserCount;
        const prodAvgAll = totalProdAvg / browserCount;
        let improvementAll = 'N/A';
        if (devAvgAll > 0 && prodAvgAll > 0) {
            const percentage = ((devAvgAll - prodAvgAll) / devAvgAll) * 100;
            improvementAll = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
        }
        table += `|                           | **Average**| **${devAvgAll.toFixed(2)}**        | **${prodAvgAll.toFixed(2)}**         | **${improvementAll}**    |\n`;
        table += `|---------------------------|------------|---------------|----------------|-------------|\n`;
    }

    const devPath = '`/apps/benchmarks/`';
    const prodPath = '`/dist/production/apps/benchmarks/`';

    return `# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (${devPath}).
- **Production Mode**: Using the optimized build output (${prodPath}).

The following table shows the average execution time in milliseconds (ms) for each test, aggregated over **${runCount} run(s)**. The value in parentheses (±) is the standard deviation, which measures the result's variance.

${table}
---

*This file is auto-generated. Do not edit manually.*
`;
}

/**
 * Main function to run the script.
 */
async function main() {
    try {
        const resultFiles = glob.sync(`${RESULTS_DIR}/*.json`);
        if (resultFiles.length === 0) {
            console.error(`Error: No result files found in ${RESULTS_DIR}. Please run the tests first.`);
            process.exit(1);
        }

        const allRunsData = await Promise.all(resultFiles.map(file => fs.readJson(file)));

        const benchmarks = parseResults(allRunsData);
        const markdown = generateMarkdown(benchmarks, resultFiles.length);
        await fs.writeFile(OUTPUT_PATH, markdown);

        console.log(`Successfully generated benchmark report at: ${OUTPUT_PATH}`);
    } catch (error) {
        console.error('Failed to generate benchmark report:', error);
        process.exit(1);
    }
}

main();
