import { writeFileSync } from 'fs';
import path from 'path';
import { glob } from 'glob';
import fsExtra from 'fs-extra';

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
                    const benchmarkName = spec.title.replace(/^(Neo.mjs|React|Angular) benchmark: /, '');

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

    // Combine "Heavy Calculation" benchmarks under a single name
    frameworks.forEach(f => {
        const responsivenessBenchmarks = allFrameworkResults[f].responsivenessBenchmarks;
        const appWorkerBenchName = 'Heavy Calculation (App Worker) UI Responsiveness';
        const mainThreadBenchName = 'Heavy Calculation (Main Thread) UI Responsiveness';
        const combinedBenchName = 'Heavy Calculation UI Responsiveness';

        if (f === 'neo' && responsivenessBenchmarks[appWorkerBenchName]) {
            responsivenessBenchmarks[combinedBenchName] = responsivenessBenchmarks[appWorkerBenchName];
            delete responsivenessBenchmarks[appWorkerBenchName];
        } else if ((f === 'angular' || f === 'react') && responsivenessBenchmarks[mainThreadBenchName]) {
            responsivenessBenchmarks[combinedBenchName] = responsivenessBenchmarks[mainThreadBenchName];
            delete responsivenessBenchmarks[mainThreadBenchName];
        }
    });

    let outputMarkdown = '# Combined Benchmark Report\n\n';

    // --- Duration Benchmarks Table ---
    outputMarkdown += '## Duration Benchmarks\n\n';
    outputMarkdown += '| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |\n';
    outputMarkdown += '|---|---|---|---|---|\n';

    const allDurationBenchmarkNames = new Set();
    frameworks.forEach(f => {
        Object.keys(allFrameworkResults[f].durationBenchmarks).forEach(name => allDurationBenchmarkNames.add(name));
    });
    const sortedDurationBenchmarkNames = Array.from(allDurationBenchmarkNames).sort();

    for (const benchmarkName of sortedDurationBenchmarkNames) {
        outputMarkdown += `| **${benchmarkName}** | | | | |\n`; // Benchmark header row

        for (const browser of BROWSERS) {
            const prodResults = {}; // Only consider Prod Mode for duration benchmarks

            frameworks.forEach(f => {
                const durationData = allFrameworkResults[f].durationBenchmarks[benchmarkName];
                if (durationData) {
                    prodResults[f] = durationData.prod[browser]?.avg;
                }
            });

            const validProdResults = Object.values(prodResults).filter(v => typeof v === 'number' && Number.isFinite(v));
            const bestProd = validProdResults.length > 0 ? Math.min(...validProdResults) : undefined;
            const worstProd = validProdResults.length > 0 ? Math.max(...validProdResults) : undefined;

            const formatDurationValue = (value, best, worst) => {
                if (value === undefined) return 'N/A';
                if (value === Infinity) return 'Timeout';
                if (value === best) return `✅ ${value.toFixed(2)}`;
                if (value === worst) return `❌ ${value.toFixed(2)}`;
                return value.toFixed(2);
            };

            outputMarkdown += `| | ${browser} | `;
            outputMarkdown += `${formatDurationValue(prodResults.neo, bestProd, worstProd)} | `;
            outputMarkdown += `${formatDurationValue(prodResults.angular, bestProd, worstProd)} | `;
            outputMarkdown += `${formatDurationValue(prodResults.react, bestProd, worstProd)} |
`;
        }
        outputMarkdown += `|---|---|---|---|---|\n`; // Separator after each benchmark group
    }

    // --- UI Responsiveness Benchmarks Table ---
    outputMarkdown += '\n## UI Responsiveness Benchmarks\n\n';
    outputMarkdown += '| Benchmark | Browser | Neo (FPS / Long Frames) | Angular (FPS / Long Frames) | React (FPS / Long Frames) |\n';
    outputMarkdown += '|---|---|---|---|---|';

    const allResponsivenessBenchmarkNames = new Set();
    frameworks.forEach(f => {
        Object.keys(allFrameworkResults[f].responsivenessBenchmarks).forEach(name => {
            allResponsivenessBenchmarkNames.add(name);
        });
    });
    const sortedResponsivenessBenchmarkNames = Array.from(allResponsivenessBenchmarkNames).sort();

    for (const benchmarkName of sortedResponsivenessBenchmarkNames) {
        outputMarkdown += `\n| **${benchmarkName}** | | | | |\n`; // Benchmark header row

        for (const browser of BROWSERS) {
            const fpsResults = {};
            const longFrameResults = {};

            frameworks.forEach(f => {
                const responsivenessData = allFrameworkResults[f].responsivenessBenchmarks[benchmarkName];
                if (responsivenessData) {
                    fpsResults[f] = responsivenessData.prod[browser]?.avgFps; // Use prod mode for responsiveness
                    longFrameResults[f] = responsivenessData.prod[browser]?.avgLongFrames;
                }
            });

            const validFpsResults = Object.values(fpsResults).filter(v => typeof v === 'number' && Number.isFinite(v));
            const validLongFrameResults = Object.values(longFrameResults).filter(v => typeof v === 'number' && Number.isFinite(v));

            // FPS: higher is better (best = max, worst = min)
            const bestFps = validFpsResults.length > 0 ? Math.max(...validFpsResults) : undefined;
            const worstFps = validFpsResults.length > 0 ? Math.min(...validFpsResults) : undefined;

            // Long Frames: lower is better (best = min, worst = max)
            const bestLongFrames = validLongFrameResults.length > 0 ? Math.min(...validLongFrameResults) : undefined;
            const worstLongFrames = validLongFrameResults.length > 0 ? Math.max(...validLongFrameResults) : undefined;

            const formatResponsivenessValue = (fpsValue, lfValue, bestFps, worstFps, bestLf, worstLf) => {
                if (fpsValue === undefined || lfValue === undefined) return 'N/A';

                let fpsFormatted = fpsValue.toFixed(1);
                if (fpsValue === bestFps) fpsFormatted = `✅ ${fpsFormatted}`;
                else if (fpsValue === worstFps) fpsFormatted = `❌ ${fpsFormatted}`;

                let lfFormatted = lfValue.toFixed(1);
                if (lfValue === bestLf) lfFormatted = `✅ ${lfFormatted}`;
                else if (lfValue === worstLf) lfFormatted = `❌ ${lfFormatted}`;

                return `${fpsFormatted} / ${lfFormatted}`;
            };

            outputMarkdown += `| | ${browser} | `;
            outputMarkdown += `${formatResponsivenessValue(fpsResults.neo, longFrameResults.neo, bestFps, worstFps, bestLongFrames, worstLongFrames)} | `;
            outputMarkdown += `${formatResponsivenessValue(fpsResults.angular, longFrameResults.angular, bestFps, worstFps, bestLongFrames, worstLongFrames)} | `;
            outputMarkdown += `${formatResponsivenessValue(fpsResults.react, longFrameResults.react, bestFps, worstFps, bestLongFrames, worstLongFrames)} |\n`;
        }
        outputMarkdown += `|---|---|---|---|---|`; // Separator after each benchmark group
    }

    writeFileSync(path.join(process.cwd(), 'COMBINED_BENCHMARK_REPORT.md'), outputMarkdown, 'utf8');
    console.log('Combined benchmark report generated: COMBINED_BENCHMARK_REPORT.md');
}

generateReport();
