import { writeFileSync } from 'fs';
import path from 'path';
import { glob } from 'glob';
import fsExtra from 'fs-extra'; // Use a distinct name for fs-extra

// Constants from generate-report.mjs
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
 * Adapted from scripts/generate-report.mjs
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

                    if (benchmarkName.endsWith(RESPONSIVENESS_TEST_SUFFIX)) {
                        initializeBenchmark(responsivenessBenchmarks, benchmarkName);
                    } else {
                        initializeBenchmark(durationBenchmarks, benchmarkName);
                    }

                    spec.tests.forEach(test => {
                        const mode = test.projectName.endsWith('-dev') ? 'dev' : 'prod';
                        const browser = BROWSERS.find(b => test.projectName.startsWith(b));

                        if (browser) {
                            if (benchmarkName.endsWith(RESPONSIVENESS_TEST_SUFFIX)) {
                                if (test.results.every(r => r.status === 'passed')) {
                                    const fpsAnnotation = test.annotations.find(a => a.type === 'averageFps');
                                    const longFrameAnnotation = test.annotations.find(a => a.type === 'longFrameCount');
                                    const target = responsivenessBenchmarks[benchmarkName][mode][browser];

                                    if (fpsAnnotation && longFrameAnnotation) {
                                        target.fps = (target.fps || []).concat(parseFloat(fpsAnnotation.description));
                                        target.longFrames = (target.longFrames || []).concat(parseFloat(longFrameAnnotation.description));
                                    }
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
                        const validTimes = result.times.filter(t => Number.isFinite(t));
                        if (validTimes.length > 0) {
                            result.avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
                            result.stdDev = getStandardDeviation(validTimes);
                        } else if (result.times.some(t => t === Infinity)) {
                            result.avg = Infinity; // Indicate all runs were timeouts
                            result.stdDev = 0; // No std dev for timeouts
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

// Main script logic
async function generateReport() {
    const frameworks = ['neo', 'angular', 'react'];
    const allFrameworkResults = {};

    for (const framework of frameworks) {
        const resultsDir = path.join(process.cwd(), `test-results-data-${framework}`);
        const resultFiles = glob.sync(`${resultsDir}/*.json`);

        if (resultFiles.length === 0) {
            console.warn(`No result files found for ${framework} in ${resultsDir}. Skipping.`);
            allFrameworkResults[framework] = { durationBenchmarks: {}, responsivenessBenchmarks: {} };
            continue;
        }

        const allRunsData = await Promise.all(resultFiles.map(file => fsExtra.readJson(file)));
        allFrameworkResults[framework] = parseResults(allRunsData);
    }

    let outputMarkdown = '# Combined Benchmark Report\n\n';
    outputMarkdown += '| Benchmark | Browser | Neo Dev (ms) | Neo Prod (ms) | Angular Dev (ms) | Angular Prod (ms) | React Dev (ms) | React Prod (ms) |\n';
    outputMarkdown += '|---|---|---|---|---|---|---|---|\n';

    const allBenchmarkNames = new Set();
    frameworks.forEach(f => {
        Object.keys(allFrameworkResults[f].durationBenchmarks).forEach(name => allBenchmarkNames.add(name));
    });

    const sortedBenchmarkNames = Array.from(allBenchmarkNames).sort();

    for (const benchmarkName of sortedBenchmarkNames) {
        outputMarkdown += `| **${benchmarkName}** | | | | | | | |`; // Benchmark header row

        for (const browser of BROWSERS) {
            const devResults = {};
            const prodResults = {};

            frameworks.forEach(f => {
                const durationData = allFrameworkResults[f].durationBenchmarks[benchmarkName];
                if (durationData) {
                    devResults[f] = durationData.dev[browser]?.avg;
                    prodResults[f] = durationData.prod[browser]?.avg;
                }
            });

            // Filter out undefined/null values for min/max calculation
            const validDevResults = Object.values(devResults).filter(v => typeof v === 'number' && Number.isFinite(v));
            const validProdResults = Object.values(prodResults).filter(v => typeof v === 'number' && Number.isFinite(v));

            const bestDev = validDevResults.length > 0 ? Math.min(...validDevResults) : undefined;
            const worstDev = validDevResults.length > 0 ? Math.max(...validDevResults) : undefined;
            const bestProd = validProdResults.length > 0 ? Math.min(...validProdResults) : undefined;
            const worstProd = validProdResults.length > 0 ? Math.max(...validProdResults) : undefined;

            const formatValue = (value, best, worst) => {
                if (value === undefined) return 'N/A';
                if (value === Infinity) return 'Timeout';
                if (value === best) return `✅ ${value.toFixed(2)}`;
                if (value === worst) return `❌ ${value.toFixed(2)}`;
                return value.toFixed(2);
            };

            outputMarkdown += `| | ${browser} | `;
            outputMarkdown += `${formatValue(devResults.neo, bestDev, worstDev)} | `;
            outputMarkdown += `${formatValue(prodResults.neo, bestProd, worstProd)} | `;
            outputMarkdown += `${formatValue(devResults.angular, bestDev, worstDev)} | `;
            outputMarkdown += `${formatValue(prodResults.angular, bestProd, worstProd)} | `;
            outputMarkdown += `${formatValue(devResults.react, bestDev, worstDev)} | `;
            outputMarkdown += `${formatValue(prodResults.react, bestProd, worstProd)} |\n`;
        }
        outputMarkdown += `|---|---|---|---|---|---|---|---|\n`; // Separator after each benchmark group
    }

    writeFileSync(path.join(process.cwd(), 'COMBINED_BENCHMARK_REPORT.md'), outputMarkdown, 'utf8');
    console.log('Combined benchmark report generated: COMBINED_BENCHMARK_REPORT.md');
}

generateReport();
