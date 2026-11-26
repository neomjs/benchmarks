import {execSync}     from 'child_process';
import fs             from 'fs-extra';
import path           from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);

const BUCKET_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SUFFIX_RE         = /^$|^[A-Za-z0-9._-]+$/;

/**
 * @summary Resolves `<resultsRoot>/<bucketName>/<suiteName>` and refuses any path traversal or root escape before cleanup.
 * @param {string} resultsRoot
 * @param {string} bucketName
 * @param {string} suiteName
 * @returns {string}
 */
export function resolveSafeResultsDir(resultsRoot, bucketName, suiteName) {
    const root = path.resolve(resultsRoot);
    if (!bucketName || typeof bucketName !== 'string' || !BUCKET_SEGMENT_RE.test(bucketName) || bucketName.includes('..')) {
        throw new Error(`Invalid result bucket "${bucketName}": must be a safe directory name inside test-results-data.`);
    }
    if (!suiteName || typeof suiteName !== 'string' || !BUCKET_SEGMENT_RE.test(suiteName) || suiteName.includes('..')) {
        throw new Error(`Invalid suite name "${suiteName}".`);
    }

    const resolved = path.resolve(root, bucketName, suiteName);
    const rel      = path.relative(root, resolved);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Refusing out-of-root results destination "${resolved}" (must stay inside "${root}").`);
    }
    return resolved;
}

/**
 * @summary Parses CLI flags + environment into an isolated, deterministic benchmark execution configuration.
 * @param {string[]} [args=process.argv.slice(2)]
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @param {string} [cwd=process.cwd()]
 */
export function buildBenchmarkConfig(args = process.argv.slice(2), env = process.env, cwd = process.cwd()) {
    const runsArg        = args.find(arg => arg.startsWith('--runs='));
    const runs           = runsArg ? parseInt(runsArg.split('=')[1], 10) : 5;
    const frameworkArg   = args.find(arg => arg.startsWith('--framework='));
    const framework      = frameworkArg ? frameworkArg.split('=')[1] : 'all';
    const suiteArg       = args.find(arg => arg.startsWith('--suite='));
    const suite          = suiteArg ? suiteArg.split('=')[1] : 'all';
    const projectsArg    = args.find(arg => arg.startsWith('--projects='));
    const projects       = projectsArg ? projectsArg.split('=')[1].split(',').filter(Boolean) : [];
    const vdomWorkerArg  = args.find(arg => arg.startsWith('--vdom-worker='));
    const vdomWorkerRaw  = vdomWorkerArg ? vdomWorkerArg.split('=')[1] : env.NEO_USE_VDOM_WORKER;
    const vdomWorker     = vdomWorkerRaw === 'true' ? true : vdomWorkerRaw === 'false' ? false : undefined;
    const interleaveArms = args.includes('--interleave-vdom-worker');
    const bucketArg      = args.find(arg => arg.startsWith('--result-bucket='));
    const customBucket   = bucketArg ? bucketArg.split('=')[1] : null;
    const throttleArg    = args.find(arg => arg.startsWith('--cpu-throttle='));
    const cpuThrottle    = throttleArg !== undefined
        ? Number(throttleArg.split('=')[1])
        : (env.NEO_CPU_THROTTLE ? Number(env.NEO_CPU_THROTTLE) : 1);
    const suffixArg      = args.find(arg => arg.startsWith('--bucket-suffix='));
    const rawSuffix      = suffixArg !== undefined ? suffixArg.split('=')[1] : null;

    if (vdomWorkerRaw !== undefined && vdomWorkerRaw !== '' && vdomWorker === undefined) {
        throw new Error(`--vdom-worker / NEO_USE_VDOM_WORKER must be "true" or "false" (got "${vdomWorkerRaw}").`);
    }
    if (!Number.isInteger(runs) || runs < 1) {
        throw new Error('--runs must be a positive integer.');
    }
    if (!Number.isFinite(cpuThrottle) || cpuThrottle < 1) {
        throw new Error(`--cpu-throttle / NEO_CPU_THROTTLE must be a finite number >= 1 (got "${throttleArg ?? env.NEO_CPU_THROTTLE}").`);
    }
    if (rawSuffix !== null && (!SUFFIX_RE.test(rawSuffix) || rawSuffix.includes('..'))) {
        throw new Error(`Invalid --bucket-suffix="${rawSuffix}": path separators and ".." are forbidden.`);
    }

    // Isolate throttled regimes from 1x runs automatically when no explicit suffix or custom bucket was supplied
    const effectiveSuffix = rawSuffix !== null
        ? rawSuffix
        : (cpuThrottle > 1 && !customBucket ? `-cpu${cpuThrottle}x` : '');

    const resultsRoot = path.resolve(cwd, 'test-results-data');

    const resolveSingleArmTarget = (fw, s) => {
        const baseBucket   = customBucket || ((fw === 'neo' && vdomWorker !== undefined)
            ? (vdomWorker ? 'neo-vdom-worker' : 'neo-app-worker')
            : fw);
        const resultBucket = customBucket
            ? (rawSuffix !== null ? `${customBucket}${rawSuffix}` : customBucket)
            : `${baseBucket}${effectiveSuffix}`;
        return {
            resultBucket,
            resultsDir: resolveSafeResultsDir(resultsRoot, resultBucket, s)
        };
    };

    const resolveInterleavedTargets = (s) => {
        const trueBucket  = `neo-vdom-worker${effectiveSuffix}`;
        const falseBucket = `neo-app-worker${effectiveSuffix}`;
        return {
            trueBucket,
            falseBucket,
            trueDir : resolveSafeResultsDir(resultsRoot, trueBucket, s),
            falseDir: resolveSafeResultsDir(resultsRoot, falseBucket, s)
        };
    };

    const buildChildEnv = (fw, s, armOverride = vdomWorker) => {
        const childEnv = {
            ...env,
            CI              : 'true',
            FRAMEWORK       : fw,
            NEO_CPU_THROTTLE: String(cpuThrottle)
        };
        if (s === 'big-data') {
            childEnv.APP = 'bigData';
        } else {
            delete childEnv.APP;
        }
        if (fw === 'neo' && typeof armOverride === 'boolean') {
            childEnv.NEO_USE_VDOM_WORKER = String(armOverride);
        } else if (fw !== 'neo' || armOverride === undefined) {
            delete childEnv.NEO_USE_VDOM_WORKER;
        }
        return childEnv;
    };

    return {
        runs,
        framework,
        suite,
        projects,
        vdomWorker,
        interleaveArms,
        customBucket,
        cpuThrottle,
        effectiveSuffix,
        resultsRoot,
        frameworksToRun: framework === 'all' ? ['neo', 'react', 'angular'] : [framework],
        suitesToRun    : suite === 'all' ? ['duration', 'scrolling', 'big-data'] : [suite],
        resolveSingleArmTarget,
        resolveInterleavedTargets,
        buildChildEnv
    };
}

/**
 * @summary Frees any existing processes bound to the target TCP ports before starting an isolated Playwright server.
 * @param {number[]} [ports=[8080]]
 */
export function ensurePortsFree(ports = [8080]) {
    for (const port of ports) {
        console.log(`--- Ensuring port ${port} is free ---`);
        try {
            if (process.platform === 'win32') {
                execSync(`(for /f "tokens=5" %i in ('netstat -aon ^| findstr :${port}') do @taskkill /F /PID %i) >nul 2>nul`);
            } else {
                execSync(`lsof -t -i:${port} | xargs kill -9`);
            }
            console.log(`Process on port ${port} killed.`);
        } catch {
            console.log(`Port ${port} is already free.`);
        }
    }
}

/**
 * The main function to orchestrate the benchmark runs.
 */
export async function main() {
    let config;
    try {
        config = buildBenchmarkConfig();
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }

    const {
        runs,
        projects,
        interleaveArms,
        frameworksToRun,
        suitesToRun,
        resolveSingleArmTarget,
        resolveInterleavedTargets,
        buildChildEnv
    } = config;

    console.log(`Starting benchmark suite for framework(s): ${frameworksToRun.join(', ')} and suite(s): ${suitesToRun.join(', ')}. Executing tests ${runs} time(s)...`);

    const specFiles = {
        neo: {
            duration  : 'tests/neo.spec.mjs',
            scrolling : 'tests/neo-scrolling.spec.mjs',
            'big-data': 'tests/neo-big-data.spec.mjs'
        },
        react: {
            duration  : 'tests/react.spec.mjs',
            scrolling : 'tests/react-scrolling.spec.mjs',
            'big-data': 'tests/react-big-data.spec.mjs'
        },
        angular: {
            duration : 'tests/angular.spec.mjs',
            scrolling: 'tests/angular-scrolling.spec.mjs'
        }
    };

    const serverPorts = {
        neo    : [8080],
        react  : [5174, 4173],
        angular: [4200]
    };

    for (const fw of frameworksToRun) {
        ensurePortsFree(serverPorts[fw] || []);

        for (const s of suitesToRun) {
            const filesToTest = specFiles[fw]?.[s];
            if (!filesToTest) {
                console.warn(`No test files found for framework ${fw} and suite ${s}. Skipping.`);
                continue;
            }

            const projectFlags            = projects.map(p => `--project=${p}`).join(' ');
            const PLAYWRIGHT_RESULTS_FILE = path.resolve(process.cwd(), 'test-results.json');
            const playwrightCmd           = `npx playwright test ${filesToTest}${projectFlags ? ' ' + projectFlags : ''}`;

            if (fw === 'neo' && interleaveArms) {
                const { trueBucket, falseBucket, trueDir, falseDir } = resolveInterleavedTargets(s);
                console.log(`--- Running AB/BA interleaved suite: ${trueBucket} vs ${falseBucket} (${s}) ---`);
                await fs.ensureDir(trueDir);
                await fs.emptyDir(trueDir);
                await fs.ensureDir(falseDir);
                await fs.emptyDir(falseDir);

                for (let i = 1; i <= runs; i++) {
                    const armOrder = (i % 2 === 1) ? [true, false] : [false, true];
                    for (const arm of armOrder) {
                        const bucket   = arm ? trueBucket : falseBucket;
                        const destDir  = arm ? trueDir : falseDir;
                        const childEnv = buildChildEnv(fw, s, arm);
                        console.log(`--- Running interleaved test: Run ${i} of ${runs} (${bucket}, cpuThrottle=${childEnv.NEO_CPU_THROTTLE}x) ---`);
                        try {
                            execSync(playwrightCmd, { stdio: 'inherit', env: childEnv });
                            const runResultFile = path.join(destDir, `test-results-run-${i}.json`);
                            await fs.move(PLAYWRIGHT_RESULTS_FILE, runResultFile, { overwrite: true });
                            console.log(`Saved results for run ${i} (${bucket}) to ${runResultFile}`);
                        } catch {
                            console.error(`An error occurred during interleaved run ${i} (${bucket}) for ${fw}/${s}. Aborting.`);
                            process.exit(1);
                        }
                    }
                }
                continue;
            }

            const { resultBucket, resultsDir } = resolveSingleArmTarget(fw, s);
            const childEnv                     = buildChildEnv(fw, s);

            console.log(`--- Running suite: ${resultBucket}/${s} (cpuThrottle=${childEnv.NEO_CPU_THROTTLE}x) ---`);
            await fs.ensureDir(resultsDir);
            await fs.emptyDir(resultsDir);

            for (let i = 1; i <= runs; i++) {
                console.log(`--- Running test: Run ${i} of ${runs} (${resultBucket}) ---`);
                try {
                    execSync(playwrightCmd, { stdio: 'inherit', env: childEnv });
                    const runResultFile = path.join(resultsDir, `test-results-run-${i}.json`);
                    await fs.move(PLAYWRIGHT_RESULTS_FILE, runResultFile, { overwrite: true });
                    console.log(`Saved results for run ${i} to ${runResultFile}`);
                } catch {
                    console.error(`An error occurred during test run ${i} for ${resultBucket}/${s}. Aborting benchmark process.`);
                    process.exit(1);
                }
            }
        }
    }

    console.log('All test runs completed successfully.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main();
}
