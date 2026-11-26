import { execSync }    from 'node:child_process';
import crypto          from 'node:crypto';
import fs              from 'node:fs';
import path            from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename  = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export const OVERLAY_MARKER_FILE = '.neo-engine-overlay.json';
export const PROVENANCE_REL_PATH = path.join('resources', 'engine-provenance.json');

export const neoAppPaths = [
    'apps/bigData/neo',
    'apps/interactive-benchmark-neo'
];

/**
 * @summary Enforces Node.js `>= 24.0.0` as required by `neo.mjs@14.0.0`.
 * @param {string} [versionString=process.versions.node]
 */
export function assertSupportedNodeVersion(versionString = process.versions.node) {
    const major = parseInt(String(versionString).split('.')[0], 10);
    if (!Number.isFinite(major) || major < 24) {
        throw new Error(`Neo.mjs v14 benchmarks require Node.js >= 24.0.0 (detected v${versionString}).`);
    }
}

/**
 * @summary Runs a shell command synchronously inside `cwd` and exits non-zero on failure.
 * @param {string} command
 * @param {string} cwd
 */
function runCommand(command, cwd) {
    console.log(`Running command: ${command} in ${cwd}`);
    try {
        execSync(command, { stdio: 'inherit', cwd });
        console.log(`Successfully ran: ${command}`);
    } catch (error) {
        console.error(`Error running command: ${command}`);
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * @summary Computes SHA-256 of `<neoDir>/src/worker/Manager.mjs` to fingerprint the active Engine source.
 * @param {string} targetNeoDir
 * @returns {string|null}
 */
function hashWorkerManager(targetNeoDir) {
    const managerFile = path.join(targetNeoDir, 'src', 'worker', 'Manager.mjs');
    if (!fs.existsSync(managerFile)) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(managerFile)).digest('hex').slice(0, 16);
}

/**
 * @summary Purges `<app>/node_modules/neo.mjs` before `npm install` when switching back from a local `--engine-path` overlay,
 * preventing npm from retaining overlaid files when the `package.json` version (`14.0.0`) matches.
 * @param {string} appFullPath
 * @returns {boolean} True when a prior local overlay was removed.
 */
export function prepareNeoAppForPublishedInstall(appFullPath) {
    const targetNeoDir = path.join(appFullPath, 'node_modules', 'neo.mjs');
    const markerPath   = path.join(targetNeoDir, OVERLAY_MARKER_FILE);
    if (fs.existsSync(markerPath)) {
        console.log(`Removing prior local neo.mjs overlay in ${targetNeoDir} so npm restores the clean published package...`);
        fs.rmSync(targetNeoDir, { recursive: true, force: true });
        return true;
    }
    return false;
}

/**
 * @summary Overlays a local `neomjs/neo` checkout (`src`, `buildScripts`, `resources/css`, `resources/scss`, `package.json`)
 * into `<app>/node_modules/neo.mjs` and stamps `.neo-engine-overlay.json` BEFORE mutating any package files so even an
 * interrupted or throwing copy forces `prepareNeoAppForPublishedInstall()` to purge the dirty package on the next setup.
 * @param {string} sourceNeoDir
 * @param {string} appFullPath
 * @param {Object} [options]
 * @param {Function} [options.copyImpl=fs.cpSync]
 * @returns {Object} Overlay metadata written to `.neo-engine-overlay.json`.
 */
export function overlayLocalEngine(sourceNeoDir, appFullPath, { copyImpl = fs.cpSync } = {}) {
    const targetNeoDir = path.join(appFullPath, 'node_modules', 'neo.mjs');
    if (!fs.existsSync(path.join(sourceNeoDir, 'src', 'Neo.mjs'))) {
        throw new Error(`Invalid NEO_ENGINE_PATH / --engine-path: ${sourceNeoDir} (missing src/Neo.mjs)`);
    }

    let gitSha = null;
    try {
        gitSha = execSync('git rev-parse HEAD', { cwd: sourceNeoDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        gitSha = null;
    }

    fs.mkdirSync(targetNeoDir, { recursive: true });
    const markerPath = path.join(targetNeoDir, OVERLAY_MARKER_FILE);
    const marker     = {
        source    : 'local-overlay',
        status    : 'in-progress',
        enginePath: sourceNeoDir,
        gitSha,
        overlaidAt: new Date().toISOString()
    };
    fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n');

    console.log(`Overlaying local neo.mjs checkout from ${sourceNeoDir} -> ${targetNeoDir}`);
    for (const rel of ['src', 'buildScripts', 'resources/css', 'resources/scss', 'package.json']) {
        const src = path.join(sourceNeoDir, rel);
        const dst = path.join(targetNeoDir, rel);
        if (fs.existsSync(src)) {
            if (fs.statSync(src).isDirectory()) {
                fs.rmSync(dst, { recursive: true, force: true });
            }
            copyImpl(src, dst, { recursive: true, force: true });
        }
    }

    marker.status = 'complete';
    fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n');
    return marker;
}

/**
 * @summary Writes `resources/engine-provenance.json` (and `dist/production/resources/engine-provenance.json` post-build)
 * recording whether the built app uses the published `neo.mjs` npm package or a local `--engine-path` overlay.
 * @param {string} appFullPath
 * @returns {Object} Provenance record.
 */
export function writeEngineProvenance(appFullPath) {
    const targetNeoDir = path.join(appFullPath, 'node_modules', 'neo.mjs');
    const pkgPath      = path.join(targetNeoDir, 'package.json');
    const markerPath   = path.join(targetNeoDir, OVERLAY_MARKER_FILE);
    const pkg          = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : { version: 'unknown' };
    const overlay      = fs.existsSync(markerPath) ? JSON.parse(fs.readFileSync(markerPath, 'utf8')) : null;

    const provenance = {
        source             : overlay ? 'local-overlay' : 'npm-package',
        overlaid           : Boolean(overlay),
        version            : pkg.version,
        gitSha             : overlay?.gitSha || null,
        enginePath         : overlay?.enginePath || null,
        workerManagerSha256: hashWorkerManager(targetNeoDir)
    };

    for (const rootDir of [appFullPath, path.join(appFullPath, 'dist', 'production')]) {
        if (fs.existsSync(rootDir)) {
            const outFile = path.join(rootDir, PROVENANCE_REL_PATH);
            fs.mkdirSync(path.dirname(outFile), { recursive: true });
            fs.writeFileSync(outFile, JSON.stringify(provenance, null, 2) + '\n');
        }
    }

    return provenance;
}

/**
 * @summary Overlays a local Engine checkout (when requested), builds the Neo.mjs app, and writes `engine-provenance.json`
 * strictly AFTER the build succeeds so a failed rebuild never stamps an older `dist/production` bundle with the new Engine source.
 * @param {string} appFullPath
 * @param {Object} [options]
 * @param {string|null} [options.enginePath=null]
 * @param {Function} [options.buildRunner]
 * @returns {Object} Provenance record written post-build.
 */
export function buildNeoApp(appFullPath, {
    enginePath  = null,
    buildRunner = (dir) => runCommand('npm run build-all -- -l no', dir)
} = {}) {
    if (enginePath) {
        overlayLocalEngine(enginePath, appFullPath);
    }
    buildRunner(appFullPath);
    return writeEngineProvenance(appFullPath);
}

export function runSetup(args = process.argv.slice(2), env = process.env) {
    assertSupportedNodeVersion();

    const neoOnly         = args.includes('--neo-only');
    const skipRootInstall = args.includes('--skip-root-install');
    const withBrowser     = args.includes('--install-browsers');
    const enginePathArg   = args.find(arg => arg.startsWith('--engine-path='));
    const enginePathRaw   = enginePathArg ? enginePathArg.split('=')[1] : env.NEO_ENGINE_PATH;
    const enginePath      = enginePathRaw ? path.resolve(process.cwd(), enginePathRaw) : null;

    const appPaths = neoOnly ? neoAppPaths : [
        ...neoAppPaths,
        'apps/bigData/react',
        'apps/interactive-benchmark-angular',
        'apps/interactive-benchmark-react'
    ];

    console.log('Starting benchmark project setup...');

    if (!skipRootInstall && !fs.existsSync(path.join(projectRoot, 'node_modules', '@playwright', 'test'))) {
        console.log('\n--- Installing root benchmark harness dependencies ---');
        runCommand('npm install', projectRoot);
    }

    if (withBrowser) {
        console.log('\n--- Installing Playwright browsers ---');
        runCommand('npx playwright install', projectRoot);
    }

    for (const appPath of appPaths) {
        const fullPath = path.join(projectRoot, appPath);
        if (!enginePath && neoAppPaths.includes(appPath)) {
            prepareNeoAppForPublishedInstall(fullPath);
        }
        console.log(`\n--- Installing dependencies for ${appPath} ---`);
        runCommand('npm install', fullPath);
    }

    for (const neoAppPath of neoAppPaths) {
        const fullPath = path.join(projectRoot, neoAppPath);
        console.log(`\n--- Building Neo.mjs app: ${neoAppPath} ---`);
        const provenance = buildNeoApp(fullPath, { enginePath });
        console.log(`Verified ${neoAppPath} Engine provenance: ${JSON.stringify(provenance)}`);
    }

    console.log('\nBenchmark project setup complete!');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    runSetup();
}
