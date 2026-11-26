import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename  = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const args          = process.argv.slice(2);
const neoOnly       = args.includes('--neo-only');
const enginePathArg = args.find(arg => arg.startsWith('--engine-path='));
const enginePathRaw = enginePathArg ? enginePathArg.split('=')[1] : process.env.NEO_ENGINE_PATH;
const enginePath    = enginePathRaw ? path.resolve(process.cwd(), enginePathRaw) : null;

const neoAppPaths = [
    'apps/bigData/neo',
    'apps/interactive-benchmark-neo'
];

const appPaths = neoOnly ? neoAppPaths : [
    ...neoAppPaths,
    'apps/bigData/react',
    'apps/interactive-benchmark-angular',
    'apps/interactive-benchmark-react'
];

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
 * @summary Overlays a local `neomjs/neo` checkout (`src`, `buildScripts`, `resources/css`, `package.json`) into `<app>/node_modules/neo.mjs`.
 * @param {string} sourceNeoDir
 * @param {string} appFullPath
 */
function overlayLocalEngine(sourceNeoDir, appFullPath) {
    const targetNeoDir = path.join(appFullPath, 'node_modules', 'neo.mjs');
    if (!fs.existsSync(path.join(sourceNeoDir, 'src', 'Neo.mjs'))) {
        throw new Error(`Invalid NEO_ENGINE_PATH / --engine-path: ${sourceNeoDir} (missing src/Neo.mjs)`);
    }

    console.log(`Overlaying local neo.mjs checkout from ${sourceNeoDir} -> ${targetNeoDir}`);
    for (const rel of ['src', 'buildScripts', 'resources/css', 'resources/scss', 'package.json']) {
        const src = path.join(sourceNeoDir, rel);
        const dst = path.join(targetNeoDir, rel);
        if (fs.existsSync(src)) {
            if (fs.statSync(src).isDirectory()) {
                fs.removeSync(dst);
            }
            fs.copySync(src, dst, { overwrite: true });
        }
    }
}

console.log('Starting benchmark project setup...');

for (const appPath of appPaths) {
    const fullPath = path.join(projectRoot, appPath);
    console.log(`\n--- Installing dependencies for ${appPath} ---`);
    runCommand('npm install', fullPath);
}

for (const neoAppPath of neoAppPaths) {
    const fullPath = path.join(projectRoot, neoAppPath);
    if (enginePath) {
        overlayLocalEngine(enginePath, fullPath);
    }
    console.log(`\n--- Building Neo.mjs app: ${neoAppPath} ---`);
    runCommand('npm run build-all -- -l no', fullPath);
}

console.log('\nBenchmark project setup complete!');
