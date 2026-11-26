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
    const frameworkArg = args.find(arg => arg.startsWith('--framework='));
    const framework    = frameworkArg ? frameworkArg.split('=')[1] : 'all';
    const suiteArg     = args.find(arg => arg.startsWith('--suite='));
    const suite        = suiteArg ? suiteArg.split('=')[1] : 'all';
    const projectsArg   = args.find(arg => arg.startsWith('--projects='));
    const projects      = projectsArg ? projectsArg.split('=')[1].split(',').filter(Boolean) : [];
    const vdomWorkerArg    = args.find(arg => arg.startsWith('--vdom-worker='));
    const vdomWorkerRaw    = vdomWorkerArg ? vdomWorkerArg.split('=')[1] : process.env.NEO_USE_VDOM_WORKER;
    const vdomWorker       = vdomWorkerRaw === 'true' ? true : vdomWorkerRaw === 'false' ? false : undefined;
    const interleaveArms   = args.includes('--interleave-vdom-worker');
    const bucketArg        = args.find(arg => arg.startsWith('--result-bucket='));
    const customBucket     = bucketArg ? bucketArg.split('=')[1] : null;
    const throttleArg      = args.find(arg => arg.startsWith('--cpu-throttle='));
    const cpuThrottle      = throttleArg ? Number(throttleArg.split('=')[1]) : (process.env.NEO_CPU_THROTTLE ? Number(process.env.NEO_CPU_THROTTLE) : 1);
    const suffixArg        = args.find(arg => arg.startsWith('--bucket-suffix='));
    const bucketSuffix     = suffixArg ? suffixArg.split('=')[1] : '';

    if (vdomWorkerRaw !== undefined && vdomWorkerRaw !== '' && vdomWorker === undefined) {
        console.error(`Error: --vdom-worker / NEO_USE_VDOM_WORKER must be "true" or "false" (got "${vdomWorkerRaw}").`);
        process.exit(1);
    }

    if (isNaN(runs) || runs < 1) {
        console.error('Error: --runs must be a positive number.');
        process.exit(1);
    }

    const frameworksToRun = framework === 'all' ? ['neo', 'react', 'angular'] : [framework];
    const suitesToRun     = suite === 'all' ? ['duration', 'scrolling', 'big-data'] : [suite];

    console.log(`Starting benchmark suite for framework(s): ${frameworksToRun.join(', ')} and suite(s): ${suitesToRun.join(', ')}. Executing tests ${runs} time(s)...`);

    // 2. Define spec files
    const specFiles = {
        neo: {
            duration: 'tests/neo.spec.mjs',
            scrolling: 'tests/neo-scrolling.spec.mjs',
            'big-data': 'tests/neo-big-data.spec.mjs'
        },
        react: {
            duration: 'tests/react.spec.mjs',
            scrolling: 'tests/react-scrolling.spec.mjs',
            'big-data': 'tests/react-big-data.spec.mjs'
        },
        angular: {
            duration: 'tests/angular.spec.mjs',
            scrolling: 'tests/angular-scrolling.spec.mjs'
        }
    };

    const serverPorts = {
        neo: [8080],
        react: [5174, 4173],
        angular: [4200]
    };

    // 3. Loop through all frameworks and suites to run
    for (const fw of frameworksToRun) {
        const ports = serverPorts[fw] || [];
        for (const port of ports) {
            console.log(`--- Ensuring port ${port} is free for ${fw} ---`);
            try {
                if (process.platform === 'win32') {
                    execSync(`(for /f "tokens=5" %i in ('netstat -aon ^| findstr :${port}') do @taskkill /F /PID %i) >nul 2>nul`);
                } else {
                    execSync(`lsof -t -i:${port} | xargs kill -9`);
                }
                console.log(`Process on port ${port} killed.`);
            } catch (error) {
                // This command fails if no process is found, which is the desired state.
                console.log(`Port ${port} is already free.`);
            }
        }

        for (const s of suitesToRun) {
            const filesToTest = specFiles[fw]?.[s];
            if (!filesToTest) {
                console.warn(`No test files found for framework ${fw} and suite ${s}. Skipping.`);
                continue;
            }

            const projectFlags  = projects.map(p => `--project=${p}`).join(' ');
            const PLAYWRIGHT_RESULTS_FILE = path.resolve(process.cwd(), 'test-results.json');

            if (fw === 'neo' && interleaveArms) {
                const trueBucket  = `neo-vdom-worker${bucketSuffix}`;
                const falseBucket = `neo-app-worker${bucketSuffix}`;
                const trueDir     = path.resolve(process.cwd(), 'test-results-data', trueBucket, s);
                const falseDir    = path.resolve(process.cwd(), 'test-results-data', falseBucket, s);
                console.log(`--- Running AB/BA interleaved suite: ${trueBucket} vs ${falseBucket} (${s}) ---`);
                await fs.ensureDir(trueDir);
                await fs.emptyDir(trueDir);
                await fs.ensureDir(falseDir);
                await fs.emptyDir(falseDir);

                for (let i = 1; i <= runs; i++) {
                    const armOrder = (i % 2 === 1) ? [true, false] : [false, true];
                    for (const arm of armOrder) {
                        const bucket  = arm ? trueBucket : falseBucket;
                        const destDir = arm ? trueDir : falseDir;
                        const throttlePrefix = cpuThrottle > 1 ? `NEO_CPU_THROTTLE=${cpuThrottle} ` : '';
                        let cmd = `${throttlePrefix}NEO_USE_VDOM_WORKER=${arm} FRAMEWORK=${fw} CI=true npx playwright test ${filesToTest}${projectFlags ? ' ' + projectFlags : ''}`;
                        if (s === 'big-data') {
                            cmd = `APP=bigData ${cmd}`;
                        }
                        console.log(`--- Running interleaved test: Run ${i} of ${runs} (${bucket}) ---`);
                        try {
                            execSync(cmd, { stdio: 'inherit' });
                            const runResultFile = path.join(destDir, `test-results-run-${i}.json`);
                            await fs.move(PLAYWRIGHT_RESULTS_FILE, runResultFile, { overwrite: true });
                            console.log(`Saved results for run ${i} (${bucket}) to ${runResultFile}`);
                        } catch (error) {
                            console.error(`An error occurred during interleaved run ${i} (${bucket}) for ${fw}/${s}. Aborting.`);
                            process.exit(1);
                        }
                    }
                }
                continue;
            }

            const resultBucket = customBucket || ((fw === 'neo' && vdomWorker !== undefined)
                ? (vdomWorker ? 'neo-vdom-worker' : 'neo-app-worker')
                : fw);
            const RESULTS_DIR = path.resolve(process.cwd(), 'test-results-data', resultBucket, s);

            console.log(`--- Running suite: ${resultBucket}/${s} ---`);
            await fs.ensureDir(RESULTS_DIR);
            await fs.emptyDir(RESULTS_DIR);

            const throttlePrefix = cpuThrottle > 1 ? `NEO_CPU_THROTTLE=${cpuThrottle} ` : '';
            const vdomEnvPrefix = (fw === 'neo' && vdomWorker !== undefined) ? `NEO_USE_VDOM_WORKER=${vdomWorker} ` : '';
            let testCommand = `${throttlePrefix}${vdomEnvPrefix}FRAMEWORK=${fw} CI=true npx playwright test ${filesToTest}${projectFlags ? ' ' + projectFlags : ''}`;
            if (s === 'big-data') {
                testCommand = `APP=bigData ${testCommand}`;
            }

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
