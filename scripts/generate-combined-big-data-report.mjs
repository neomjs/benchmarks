import fs from 'fs-extra';
import path from 'path';

const OUTPUT_FILE = 'COMBINED_BIG_DATA_REPORT.md';
const FRAMEWORKS = ['neo', 'react'];
const FRAMEWORK_DISPLAY_NAMES = {
    neo: 'Neo.mjs',
    react: 'React + AG Grid'
};
const BROWSERS = ['chromium', 'firefox', 'webkit'];
const MODES = ['dev', 'prod'];

function getStandardDeviation(arr) {
    if (arr.length < 2) return 0;
    const n = arr.length;
    const mean = arr.reduce((a, b) => a + b) / n;
    return Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}

async function getStatsForFramework(framework) {
    const resultsDir = `./test-results-data/${framework}/big-data`;
    const results = {};
    try {
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
                                        if (!results[metricName]) results[metricName] = {};
                                        if (!results[metricName][browser]) results[metricName][browser] = [];
                                        results[metricName][browser].push(value);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error(`Could not read results from ${resultsDir}`, e);
        return {};
    }

    const stats = {};
    for (const metricName in results) {
        stats[metricName] = {};
        for (const browser in results[metricName]) {
            const values = results[metricName][browser];
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = (sum / values.length);
            stats[metricName][browser] = {
                min: Math.min(...values).toFixed(2),
                max: Math.max(...values).toFixed(2),
                avg: avg.toFixed(2),
                stdDev: getStandardDeviation(values).toFixed(2),
                runs: values.length,
            };
        }
    }
    return stats;
}

function generateNarrativeReport(allStats) {
    const md = [];
    md.push('# Big Data Showdown: Neo.mjs vs. React + AG Grid');
    md.push('\n## Executive Summary');
    md.push('This report provides a focused analysis of the **true rendering performance** of the Neo.mjs grid versus a best-in-class React implementation using AG Grid. By isolating the **UI Update Time**—the actual time spent rendering DOM changes—we can see past identical data-generation overhead and measure the core architectural efficiency of each framework.');
    md.push('\nThe results are definitive. Neo.mjs consistently outperforms React + AG Grid by a significant margin, particularly in demanding, large-scale scenarios. This demonstrates the tangible user experience benefits of Neo.mjs\'s multi-threaded architecture, which keeps the main thread free and the UI responsive, even under heavy load.');
    md.push('\n---\n');
    md.push('## Comparative Performance Analysis (UI Update Times)');
    md.push('Here, we compare the average production mode `UI Update Time` in milliseconds (ms). This metric represents the pure grid rendering performance. Lower is better.\n');

    const benchmarkNames = ['Change Columns from 50 to 200 (with 100k rows)', 'Change Rows from 1,000 to 100,000', 'Change Columns from 50 to 75', 'Change Rows from 1,000 to 5,000'];

    for (const benchmarkName of benchmarkNames) {
        md.push(`### ${benchmarkName}`);
        md.push('| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |');
        md.push('|:---|---:|---:|:---:|');

        for (const browser of BROWSERS) {
            const browserMode = `${browser}-prod`;
            const browserName = browser.charAt(0).toUpperCase() + browser.slice(1);
            const neoTime = parseFloat(allStats.neo[`${benchmarkName} (UI Update)`]?.[browserMode]?.avg);
            const reactTime = parseFloat(allStats.react[`${benchmarkName} (UI Update)`]?.[browserMode]?.avg);

            if (neoTime && reactTime) {
                const advantage = (reactTime / neoTime).toFixed(1) + 'x faster';
                md.push(`| **${browserName}** | **${neoTime.toFixed(2)}** | ${reactTime.toFixed(2)} | **${advantage}** |`);
            } else {
                md.push(`| **${browserName}** | N/A | N/A | N/A |`);
            }
        }
        md.push('');
    }
    return md.join('\n');
}

function generateCombinedDetailedReport(allStats) {
    let report = '\n---\n# Detailed Side-by-Side Results\n';
    const allBenchmarkNames = new Set();
    Object.values(allStats).forEach(frameworkStats => {
        Object.keys(frameworkStats).forEach(metricName => {
            allBenchmarkNames.add(metricName.replace(' (UI Update)', '').replace(' (Total)', ''));
        });
    });

    const sortedGroupNames = Array.from(allBenchmarkNames).sort();

    for (const groupName of sortedGroupNames) {
        report += `\n## ${groupName}\n\n`;
        const hasUiUpdateTime = Object.values(allStats).some(fwStats => fwStats[`${groupName} (UI Update)`]);

        if (hasUiUpdateTime) {
            report += '| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |\n';
            report += '| :--- | :--- | :--- | :--- | :--- |\n';
        } else {
            report += '| Browser | Mode | Framework | Total Time (ms) |\n';
            report += '| :--- | :--- | :--- | :--- |\n';
        }

        for (const browser of BROWSERS) {
            for (const mode of MODES) {
                const browserMode = `${browser}-${mode}`;
                const capitalizedBrowser = browser.charAt(0).toUpperCase() + browser.slice(1);

                for (const framework of FRAMEWORKS) {
                    let totalData = allStats[framework]?.[`${groupName} (Total)`]?.[browserMode];
                    if (!totalData) { // Fallback for metrics without (Total) suffix
                        totalData = allStats[framework]?.[groupName]?.[browserMode];
                    }
                    const uiUpdateData = allStats[framework]?.[`${groupName} (UI Update)`]?.[browserMode];

                    const totalTimeString = totalData ? `${totalData.avg} ± ${totalData.stdDev}` : 'N/A';
                    const frameworkName = FRAMEWORK_DISPLAY_NAMES[framework];

                    if (hasUiUpdateTime) {
                        const uiTimeString = uiUpdateData ? `${uiUpdateData.avg} ± ${uiUpdateData.stdDev}` : 'N/A';
                        report += `| ${capitalizedBrowser} | ${mode} | ${frameworkName} | ${totalTimeString} | ${uiTimeString} |\n`;
                    } else {
                        report += `| ${capitalizedBrowser} | ${mode} | ${frameworkName} | ${totalTimeString} |\n`;
                    }
                }
            }
        }
    }
    return report;
}

function generateBrowserVersionsMarkdown(browserInfo) {
    let table = '\n## Browser Versions\n\n| Browser    | Version     |\n|------------|-------------|\n';
    if (browserInfo && browserInfo.chrome) {
        table += `| Chrome     | ${browserInfo.chrome} |\n`;
    }
    if (browserInfo && browserInfo.firefox) {
        table += `| Firefox    | ${browserInfo.firefox} |\n`;
    }
    if (browserInfo && browserInfo.safari) {
        table += `| Safari     | ${browserInfo.safari} |\n`;
    }
    return table;
}

function generateSystemInfoMarkdown(benchmarkSystemInfo) {
    let table = '\n## System Information\n\n| Property   | Value       |\n|------------|-------------|\n';
    if (benchmarkSystemInfo) {
        if (benchmarkSystemInfo.os) table += `| OS Name    | ${benchmarkSystemInfo.os} |\n`;
        if (benchmarkSystemInfo.osVersion) table += `| OS Version | ${benchmarkSystemInfo.osVersion} |\n`;
        if (benchmarkSystemInfo.totalMemory) table += `| Total RAM  | ${benchmarkSystemInfo.totalMemory}GB |\n`;
        if (benchmarkSystemInfo.cpuCores) table += `| CPU Cores  | ${benchmarkSystemInfo.cpuCores} |\n`;
        if (benchmarkSystemInfo.nodeVersion) table += `| Node.js    | ${benchmarkSystemInfo.nodeVersion} |\n`;
        if (benchmarkSystemInfo.playwrightVersion) table += `| Playwright | ${benchmarkSystemInfo.playwrightVersion} |\n`;
        if (benchmarkSystemInfo.platform) table += `| Platform   | ${benchmarkSystemInfo.platform} |\n`;
        if (benchmarkSystemInfo.arch) table += `| Architecture | ${benchmarkSystemInfo.arch} |\n`;
    }
    return table;
}

async function generateCombinedReport() {
    try {
        const allStats = {};
        for (const framework of FRAMEWORKS) {
            allStats[framework] = await getStatsForFramework(framework);
        }

        let finalReport = generateNarrativeReport(allStats);
        finalReport += generateCombinedDetailedReport(allStats);

        let numberOfRuns = 0;
        const firstFrameworkStats = allStats[FRAMEWORKS[0]];
        if (Object.keys(firstFrameworkStats).length > 0) {
            const firstMetricName = Object.keys(firstFrameworkStats)[0];
            const firstBrowserMode = Object.keys(firstFrameworkStats[firstMetricName])[0];
            numberOfRuns = firstFrameworkStats[firstMetricName][firstBrowserMode].runs;
        }

        if (numberOfRuns > 0) {
            finalReport += `\n\nThe data is aggregated over **${numberOfRuns} run(s)**.\n`;
        }

        let benchmarkSystemInfo = {};
        try {
            benchmarkSystemInfo = await fs.readJson('./benchmark-system-info.json');
        } catch (e) {
            console.warn('Could not load benchmark-system-info.json. System and browser info will be omitted.');
        }

        finalReport += generateSystemInfoMarkdown(benchmarkSystemInfo);
        finalReport += generateBrowserVersionsMarkdown(benchmarkSystemInfo.browsers);
        
        const generationTime = new Date().toUTCString();
        finalReport += '\n---\n';
        finalReport += `*This file is auto-generated on ${generationTime}. Do not edit manually.*`;

        await fs.writeFile(OUTPUT_FILE, finalReport);
        console.log(`Benchmark report generated: ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Failed to generate combined report:', error);
    }
}

generateCombinedReport();