import {execSync} from 'child_process';
import fs         from 'fs-extra';
import path       from 'path';

/**
 * The main function to orchestrate the benchmark runs.
 */
async function main() {
    // 1. Parse command-line arguments
    const args         = process.argv.slice(2);
    const runsArg      = args.find(arg => arg.startsWith('--runs='));
    const runs         = runsArg ? parseInt(runsArg.split('=')[1], 10) : 5;
    const suiteArg     = args.find(arg => arg.startsWith('--suite='));
    const suite        = suiteArg ? suiteArg.split('=')[1] : 'all';

    if (isNaN(runs) || runs < 1) {
        console.error('Error: --runs must be a positive number.');
        process.exit(1);
    }

    const frameworksToRun = framework === 'all' ? ['neo', 'react', 'angular'] : [framework];
    const suitesToRun     = suite === 'all' ? ['duration', 'scrolling'] : [suite];

    console.log(`Starting benchmark suite for framework(s): ${frameworksToRun.join(', ')} and suite(s): ${suitesToRun.join(', ')}. Executing tests ${runs} time(s)...`);

    // 2. Define spec files
    const specFiles = {
        neo: {
            duration: 'tests/neo.spec.mjs',
            scrolling: 'tests/neo-scrolling.spec.mjs'
        },
        react: {
            duration: 'tests/react.spec.mjs',
            scrolling: 'tests/react-scrolling.spec.mjs'
        },
        angular: {
            duration: 'tests/angular.spec.mjs',
            scrolling: 'tests/angular-scrolling.spec.mjs'
        }
    };

    // 3. Loop through all frameworks and suites to run
    for (const fw of frameworksToRun) {
        for (const s of suitesToRun) {
            const filesToTest = specFiles[fw]?.[s];
            if (!filesToTest) {
                console.warn(`No test files found for framework ${fw} and suite ${s}. Skipping.`);
                continue;
            }

            const RESULTS_DIR = path.resolve(process.cwd(), 'test-results-data', fw, s);
            const PLAYWRIGHT_RESULTS_FILE = path.resolve(process.cwd(), 'test-results.json');

            console.log(`--- Running suite: ${fw}/${s} ---`);
            await fs.ensureDir(RESULTS_DIR);
            await fs.emptyDir(RESULTS_DIR);

            const testCommand = `CI=true npx playwright test ${filesToTest}`;

            // 4. Loop through the specified number of runs for the current suite
            for (let i = 1; i <= runs; i++) {
                console.log(`--- Running test: Run ${i} of ${runs} ---`);

                try {
                    execSync(testCommand, { stdio: 'inherit' });

                    const runResultFile = path.join(RESULTS_DIR, `test-results-run-${i}.json`);
                    await fs.move(PLAYWRIGHT_RESULTS_FILE, runResultFile, { overwrite: true });
                    console.log(`Saved results for run ${i} to ${runResultFile}`);

                } catch (error) {
                    console.error(`An error occurred during test run ${i} for ${fw}/${s}. Aborting benchmark process.`);
                    process.exit(1);
                }
            }
        }
    }

    console.log('All test runs completed successfully.');
}

main();
