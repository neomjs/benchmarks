import fs from 'fs-extra';
import path from 'path';

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
    const stats = {}; // { 'change-rows': { 'chromium-dev': { min, max, avg }, ... } }
    for (const metricName in results) {
        stats[metricName] = {};
        for (const browser in results[metricName]) {
            const values = results[metricName][browser];
            const sum = values.reduce((a, b) => a + b, 0);
            stats[metricName][browser] = {
                min: Math.min(...values).toFixed(2),
                max: Math.max(...values).toFixed(2),
                avg: (sum / values.length).toFixed(2),
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
        report += `| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
`;
        report += `| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
`;
        report += `| | | Min | Max | Avg | Min | Max | Avg |
`; // Second header row for sub-columns

        const sortedBrowsers = Object.keys(group['Total Time'] || group['UI Update Time'] || {}).sort();

        for (const browserMode of sortedBrowsers) {
            const [browser, mode] = browserMode.split('-');
            const capitalizedBrowser = browser.charAt(0).toUpperCase() + browser.slice(1);

            // Get data for Total Time
            const totalData = group['Total Time'] && group['Total Time'][browserMode] ? group['Total Time'][browserMode] : { min: 'N/A', max: 'N/A', avg: 'N/A' };
            // Get data for UI Update Time
            const uiUpdateData = group['UI Update Time'] && group['UI Update Time'][browserMode] ? group['UI Update Time'][browserMode] : { min: 'N/A', max: 'N/A', avg: 'N/A' };

            report += `| ${capitalizedBrowser} | ${mode} | ${totalData.min} | ${totalData.max} | ${totalData.avg} | ${uiUpdateData.min} | ${uiUpdateData.max} | ${uiUpdateData.avg} |
`;
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

    report += systemInfoSection;

    await fs.writeFile(outputFile, report);
    console.log(`Benchmark report generated: ${outputFile}`);
}

generateReport().catch(console.error);
