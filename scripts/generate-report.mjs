import fs from 'fs-extra';
import path from 'path';

const RESULTS_PATH = path.resolve(process.cwd(), 'test-results.json');
const OUTPUT_PATH = path.resolve(process.cwd(), 'BENCHMARK_RESULTS.md');
const BROWSERS = ['chromium', 'firefox', 'webkit'];

/**
 * Parses the raw JSON output from the Playwright JSON reporter.
 * @param {Object} rawData The raw JSON data from test-results.json
 * @returns {Object} A structured object with benchmark results.
 */
function parseResults(rawData) {
    const benchmarks = {};

    const initializeBenchmark = (name) => {
        if (!benchmarks[name]) {
            benchmarks[name] = { dev: {}, prod: {} };
            BROWSERS.forEach(browser => {
                benchmarks[name].dev[browser] = { times: [], avg: 0 };
                benchmarks[name].prod[browser] = { times: [], avg: 0 };
            });
        }
    };

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

    rawData.suites.forEach(processSuite);

    // Calculate averages
    for (const benchmarkName in benchmarks) {
        const benchmark = benchmarks[benchmarkName];
        let devTotal = 0, devCount = 0;
        let prodTotal = 0, prodCount = 0;

        BROWSERS.forEach(browser => {
            const devResult = benchmark.dev[browser];
            if (devResult.times.length > 0) {
                devResult.avg = devResult.times.reduce((a, b) => a + b, 0) / devResult.times.length;
                devTotal += devResult.avg;
                devCount++;
            }

            const prodResult = benchmark.prod[browser];
            if (prodResult.times.length > 0) {
                prodResult.avg = prodResult.times.reduce((a, b) => a + b, 0) / prodResult.times.length;
                prodTotal += prodResult.avg;
                prodCount++;
            }
        });

        benchmark.dev.average = devCount > 0 ? devTotal / devCount : 0;
        benchmark.prod.average = prodCount > 0 ? prodTotal / prodCount : 0;
    }

    return benchmarks;
}

/**
 * Generates the markdown content for the results file.
 * @param {Object} benchmarks The structured benchmark data.
 * @returns {String} The markdown content as a string.
 */
function generateMarkdown(benchmarks) {
    let table = `| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |
|---------------------------|------------|---------------|----------------|-------------|
`;

    const sortedKeys = Object.keys(benchmarks).sort();

    for (const key of sortedKeys) {
        const result = benchmarks[key];
        table += `| **${key}**               |            |               |                |             |
`;

        BROWSERS.forEach(browser => {
            const devAvg = result.dev[browser].avg;
            const prodAvg = result.prod[browser].avg;
            let improvement = 'N/A';
            if (devAvg > 0 && prodAvg > 0) {
                const percentage = ((devAvg - prodAvg) / devAvg) * 100;
                improvement = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
            }
            table += `|                           | ${browser.padEnd(10)} | ${devAvg.toFixed(2).padEnd(13)} | ${prodAvg.toFixed(2).padEnd(14)} | ${improvement.padEnd(11)} |
`;
        });
        
        const devAvgAll = result.dev.average;
        const prodAvgAll = result.prod.average;
        let improvementAll = 'N/A';
        if (devAvgAll > 0 && prodAvgAll > 0) {
            const percentage = ((devAvgAll - prodAvgAll) / devAvgAll) * 100;
            improvementAll = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
        }
        table += `|                           | **Average**| **${devAvgAll.toFixed(2)}**        | **${prodAvgAll.toFixed(2)}**         | **${improvementAll}**    |
`;
        table += `|---------------------------|------------|---------------|----------------|-------------|
`;
    }

    return `# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (\\\`/apps/benchmarks/\\\\\`).
- **Production Mode**: Using the optimized build output (\\\`/dist/production/apps/benchmarks/\\\\\`).

The following table shows the execution time in milliseconds (ms) for each test, broken down by browser.

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
        if (!fs.existsSync(RESULTS_PATH)) {
            console.error('Error: test-results.json not found. Please run the tests first.');
            process.exit(1);
        }

        const rawData = await fs.readJson(RESULTS_PATH);
        const benchmarks = parseResults(rawData);
        const markdown = generateMarkdown(benchmarks);
        await fs.writeFile(OUTPUT_PATH, markdown);

        console.log(`Successfully generated benchmark report at: ${OUTPUT_PATH}`);
    } catch (error) {
        console.error('Failed to generate benchmark report:', error);
        process.exit(1);
    }
}

main();