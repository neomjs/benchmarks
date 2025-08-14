import fs from 'fs-extra';
import path from 'path';

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

const resultsDir = './test-results-data/neo/big-data';
const outputFile = 'BENCHMARK_RESULTS_NEO_BIG_DATA.md';

async function generateReport() {
    const results = {}; // { 'change-rows': { 'chromium-dev': [1, 2, 3], ... } }

    // 1. Read all result files
    const files = await fs.readdir(resultsDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const filePath = path.join(resultsDir, file);
            const runData = await fs.readJson(filePath);

            for (const suite of runData.suites) {
                for (const spec of suite.specs) {
                    for (const test of spec.tests) {
                        const browser = test.projectName;
                        if (!browser) continue;

                        for (const annotation of test.annotations) {
                            if (annotation.type === 'performance') {
                                const performanceData = JSON.parse(annotation.description);
                                for (const [metricName, value] of Object.entries(performanceData)) {
                                    if (!results[metricName]) {
                                        results[metricName] = {};
                                    }
                                    if (!results[metricName][browser]) {
                                        results[metricName][browser] = [];
                                    }
                                    results[metricName][browser].push(value);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Calculate stats
    const stats = {}; // { 'change-rows': { 'chromium-dev': { min, max, avg, stdDev, runs }, ... } }
    for (const metricName in results) {
        stats[metricName] = {};
        for (const browser in results[metricName]) {
            const values = results[metricName][browser];
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = (sum / values.length); // Calculate raw average for stdDev
            const stdDev = getStandardDeviation(values);

            stats[metricName][browser] = {
                min: Math.min(...values).toFixed(2),
                max: Math.max(...values).toFixed(2),
                avg: avg.toFixed(2),
                stdDev: stdDev.toFixed(2),
                runs: values.length,
            };
        }
    }

    // 3. Generate Markdown Report
    let report = '# Neo.mjs Big Data Grid Benchmark Results\n\n';
    let systemInfoSection = '';

    const groupedStats = {};

    for (const metricName in stats) {
        let baseName = metricName;
        let type = 'Total Time';

        if (metricName.includes('(UI Update)')) {
            baseName = metricName.replace(' (UI Update)', '');
            type = 'UI Update Time';
        }
        // If the metricName includes "(Total)", remove it for the baseName
        if (baseName.includes('(Total)')) {
            baseName = baseName.replace(' (Total)', '');
        }

        if (!groupedStats[baseName]) {
            groupedStats[baseName] = {};
        }
        groupedStats[baseName][type] = stats[metricName];
    }

    const sortedGroupNames = Object.keys(groupedStats).sort();

    for (const groupName of sortedGroupNames) {
        const group = groupedStats[groupName];
        report += `## ${groupName}\n\n`;

        const hasUiUpdateTime = !!group['UI Update Time'];

        if (hasUiUpdateTime) {
            report += `| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |\n`;
            report += `| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
            report += `| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |\n`;
        } else {
            report += `| Browser | Mode | Total Time (ms) | | |\n`;
            report += `| :--- | :--- | ---: | ---: | ---: |\n`;
            report += `| | | Min | Max | Avg ± StdDev |\n`;
        }

        const sortedBrowsers = Object.keys(group['Total Time'] || group['UI Update Time'] || {}).sort();

        for (const browserMode of sortedBrowsers) {
            const [browser, mode] = browserMode.split('-');
            const capitalizedBrowser = browser.charAt(0).toUpperCase() + browser.slice(1);

            // Get data for Total Time
            const totalData = group['Total Time'] && group['Total Time'][browserMode] ? group['Total Time'][browserMode] : { min: 'N/A', max: 'N/A', avg: 'N/A', stdDev: 'N/A', runs: 'N/A' };

            if (hasUiUpdateTime) {
                // Get data for UI Update Time
                const uiUpdateData = group['UI Update Time'] && group['UI Update Time'][browserMode] ? group['UI Update Time'][browserMode] : { min: 'N/A', max: 'N/A', avg: 'N/A', stdDev: 'N/A', runs: 'N/A' };
                report += `| ${capitalizedBrowser} | ${mode} | ${totalData.min} | ${totalData.max} | ${totalData.avg} ± ${totalData.stdDev} | ${uiUpdateData.min} | ${uiUpdateData.max} | ${uiUpdateData.avg} ± ${uiUpdateData.stdDev} |\n`;
            } else {
                report += `| ${capitalizedBrowser} | ${mode} | ${totalData.min} | ${totalData.max} | ${totalData.avg} ± ${totalData.stdDev} |\n`;
            }
        }
        report += '\n'; // Add a newline after each group table
    }

    // Add system info
    try {
        const systemInfo = await fs.readJson('./benchmark-system-info.json');
        systemInfoSection += '## System Information\n';
        systemInfoSection += `* **OS:** ${systemInfo.os} ${systemInfo.osVersion} (${systemInfo.arch})\n`;
        systemInfoSection += `* **CPU:** ${systemInfo.cpuModel} (${systemInfo.cpuCores} cores @ ${systemInfo.cpuSpeed}GHz)\n`;
        systemInfoSection += `* **Memory:** ${systemInfo.totalMemory}GB\n`;
        systemInfoSection += `* **Node.js:** ${systemInfo.nodeVersion}\n`;
        systemInfoSection += `* **Playwright:** ${systemInfo.playwrightVersion}\n\n`;
    } catch (e) {
        systemInfoSection += 'Could not load system information.\n\n';
    }

    // Add number of runs as a footer note
    let numberOfRuns = 0;
    if (Object.keys(stats).length > 0) {
        const firstMetricName = Object.keys(stats)[0];
        const firstBrowserMode = Object.keys(stats[firstMetricName])[0];
        numberOfRuns = stats[firstMetricName][firstBrowserMode].runs;
    }

    if (numberOfRuns > 0) {
        report += `\n\nThe data is aggregated over **${numberOfRuns} run(s)**.\n\n`;
    }

    report += systemInfoSection;

    await fs.writeFile(outputFile, report);
    console.log(`Benchmark report generated: ${outputFile}`);
}

generateReport().catch(console.error);