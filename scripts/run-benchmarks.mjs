import {execSync} from 'child_process';
import fs         from 'fs-extra';
import path       from 'path';

const RESULTS_DIR = path.resolve(process.cwd(), 'test-results-data');
const PLAYWRIGHT_RESULTS_FILE = path.resolve(process.cwd(), 'test-results.json');

/**
 * The main function to orchestrate the benchmark runs.
 */
async function main() {
    // 1. Parse command-line arguments to determine the number of runs.
    const args = process.argv.slice(2);
    const runsArg = args.find(arg => arg.startsWith('--runs='));
    const runs = runsArg ? parseInt(runsArg.split('=')[1], 10) : 5; // Default to 5 runs

    if (isNaN(runs) || runs < 1) {
        console.error('Error: --runs must be a positive number.');
        process.exit(1);
    }

    console.log(`Starting benchmark suite. Executing tests ${runs} time(s)...`);

    // 2. Ensure a clean state by removing old run data.
    await fs.emptyDir(RESULTS_DIR);

    // 3. Loop through the specified number of runs.
    for (let i = 1; i <= runs; i++) {
        console.log(`--- Running test suite: Run ${i} of ${runs} ---`);

        try {
            // Execute Playwright tests. CI=true forces serial execution for accuracy.
            // The output is configured in playwright.config.mjs to be 'test-results.json'.
            execSync('CI=true npx playwright test', { stdio: 'inherit' });

            // Move and rename the result file for this specific run.
            const runResultFile = path.join(RESULTS_DIR, `test-results-run-${i}.json`);
            await fs.move(PLAYWRIGHT_RESULTS_FILE, runResultFile, { overwrite: true });
            console.log(`Saved results for run ${i} to ${runResultFile}`);

        } catch (error) {
            console.error(`An error occurred during test run ${i}. Aborting benchmark process.`);
            // We exit here because a single failed run invalidates the entire aggregate report.
            process.exit(1);
        }
    }

    console.log('All test runs completed successfully.');

    // 4. After all runs are complete, trigger the report generation.
    console.log('Aggregating results and generating final report...');
    try {
        execSync('node ./scripts/generate-report.mjs', { stdio: 'inherit' });
    } catch (error) {
        console.error('Failed to generate the final report.');
        process.exit(1);
    }
}

main();
