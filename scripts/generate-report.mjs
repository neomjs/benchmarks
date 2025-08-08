import fs from 'fs-extra';
import path from 'path';

const RESULTS_PATH = path.resolve(process.cwd(), 'test-results.json');
const OUTPUT_PATH = path.resolve(process.cwd(), 'BENCHMARK_RESULTS.md');

/**
 * Parses the raw JSON output from the Playwright JSON reporter.
 * @param {Object} rawData The raw JSON data from test-results.json
 * @returns {Object} A structured object with benchmark results.
 */
function parseResults(rawData) {
    const benchmarks = {};

    // Initialize benchmark structure
    const initializeBenchmark = (name) => {
        if (!benchmarks[name]) {
            benchmarks[name] = {
                dev: { times: [], avg: 0 },
                prod: { times: [], avg: 0 }
            };
        }
    };

    // Recursively process suites to find tests
    const processSuite = (suite) => {
        if (suite.specs) {
            suite.specs.forEach(spec => {
                const benchmarkName = spec.title.replace('Neo.mjs benchmark: ', '');
                initializeBenchmark(benchmarkName);

                spec.tests.forEach(test => {
                    const mode = test.projectName.endsWith('-dev') ? 'dev' : 'prod';
                    // Only use results from passed tests
                    if (test.results.every(r => r.status === 'passed')) {
                        const durationAnnotation = test.annotations.find(a => a.type === 'duration');
                        if (durationAnnotation) {
                            const duration = parseFloat(durationAnnotation.description);
                            benchmarks[benchmarkName][mode].times.push(duration);
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
        if (benchmark.dev.times.length > 0) {
            benchmark.dev.avg = benchmark.dev.times.reduce((a, b) => a + b, 0) / benchmark.dev.times.length;
        }
        if (benchmark.prod.times.length > 0) {
            benchmark.prod.avg = benchmark.prod.times.reduce((a, b) => a + b, 0) / benchmark.prod.times.length;
        }
    }

    return benchmarks;
}

/**
 * Generates the markdown content for the results file.
 * @param {Object} benchmarks The structured benchmark data.
 * @returns {String} The markdown content as a string.
 */
function generateMarkdown(benchmarks) {
    let table = `| Benchmark                 | Dev Mode (Avg ms) | Prod Mode (Avg ms) | Improvement |
|---------------------------|-------------------|--------------------|-------------|
`;

    const sortedKeys = Object.keys(benchmarks).sort();

    for (const key of sortedKeys) {
        const result = benchmarks[key];
        const devAvg = result.dev.avg.toFixed(2);
        const prodAvg = result.prod.avg.toFixed(2);
        let improvement = 'N/A';
        if (result.dev.avg > 0 && result.prod.avg > 0) {
            const percentage = ((result.dev.avg - result.prod.avg) / result.dev.avg) * 100;
            improvement = `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
        }

        table += `| ${key.padEnd(25)} | ${devAvg.padEnd(17)} | ${prodAvg.padEnd(18)} | **${improvement}** |
`;
    }

    return `# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (\\\`/apps/benchmarks/\\\`).
- **Production Mode**: Using the optimized build output (\\\`/dist/production/apps/benchmarks/\\\`).

The following table shows the average execution time in milliseconds (ms) for each test across Chromium, Firefox, and WebKit. The performance improvement is calculated based on the reduction in time from Development to Production mode.

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
            console.error('Error: test-results.json not found. Please run the tests first with `npx playwright test`.');
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
