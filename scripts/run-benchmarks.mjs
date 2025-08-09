import {execSync} from 'child_process';
import fs         from 'fs-extra';
import path       from 'path';

/**
 * The main function to orchestrate the benchmark runs.
 */
async function main() {
    // 1. Parse command-line arguments
    const args = process.argv.slice(2);
    const runsArg = args.find(arg => arg.startsWith('--runs='));
    const runs = runsArg ? parseInt(runsArg.split('=')[1], 10) : 5;
    const frameworkArg = args.find(arg => arg.startsWith('--framework='));
    const framework = frameworkArg ? frameworkArg.split('=')[1] : 'all';

    if (isNaN(runs) || runs < 1) {
        console.error('Error: --runs must be a positive number.');
        process.exit(1);
    }

    const RESULTS_DIR = path.resolve(process.cwd(), `test-results-data-${framework}`);
    const PLAYWRIGHT_RESULTS_FILE = path.resolve(process.cwd(), 'test-results.json');

    console.log(`Starting benchmark suite for ${framework}. Executing tests ${runs} time(s)...`);

    // 2. Ensure a clean state by removing old run data.
    await fs.emptyDir(RESULTS_DIR);

    // 3. Determine the test command
    let testCommand = 'CI=true npx playwright test';
    if (framework === 'neo') {
        testCommand += ' tests/neo.spec.mjs';
    } else if (framework === 'react') {
        testCommand += ' tests/react.spec.mjs';
    }

    // 4. Loop through the specified number of runs.
    for (let i = 1; i <= runs; i++) {
        console.log(`--- Running test suite: Run ${i} of ${runs} ---`);

        try {
            execSync(testCommand, { stdio: 'inherit' });

            const runResultFile = path.join(RESULTS_DIR, `test-results-run-${i}.json`);
            await fs.move(PLAYWRIGHT_RESULTS_FILE, runResultFile, { overwrite: true });
            console.log(`Saved results for run ${i} to ${runResultFile}`);

        } catch (error) {
            console.error(`An error occurred during test run ${i}. Aborting benchmark process.`);
            process.exit(1);
        }
    }

    console.log('All test runs completed successfully.');

    // 5. After all runs are complete, trigger the report generation.
    console.log('Aggregating results and generating final report...');
    try {
        execSync(`node ./scripts/generate-report.mjs --framework=${framework}`, { stdio: 'inherit' });
    } catch (error) {
        console.error('Failed to generate the final report.');
        process.exit(1);
    }
}

main();