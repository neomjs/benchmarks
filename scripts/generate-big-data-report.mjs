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
                                const [metricName, value] = Object.entries(performanceData)[0];

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

    for (const metricName in stats) {
        let title = metricName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (metricName === 'change-rows') {
            title = 'Change Rows from 1,000 to 5,000';
        } else if (metricName === 'change-cols') {
            title = 'Change Columns from 50 to 75';
        } else if (metricName === 'Change Columns from 50 to 200') {
            title = 'Change Columns from 50 to 200 (with 100k rows)';
        }
        report += `## ${title}\n\n`;
        report += '| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |\n';
        report += '| :--- | :--- | ---: | ---: | ---: |\n';

        const sortedKeys = Object.keys(stats[metricName]).sort();

        for (const key of sortedKeys) {
            const [browser, mode] = key.split('-');
            const { min, max, avg } = stats[metricName][key];
            report += `| ${browser.charAt(0).toUpperCase() + browser.slice(1)} | ${mode} | ${min} | ${max} | ${avg} |\n`;
        }
        report += '\n';
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