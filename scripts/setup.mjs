import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname);

const appPaths = [
    'apps/bigData/neo',
    'apps/bigData/react',
    'apps/interactive-benchmark-angular',
    'apps/interactive-benchmark-neo',
    'apps/interactive-benchmark-react'
];

const neoAppPaths = [
    'apps/bigData/neo',
    'apps/interactive-benchmark-neo'
];

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

console.log('Starting benchmark project setup...');

for (const appPath of appPaths) {
    const fullPath = path.join(projectRoot, appPath);
    console.log(`\n--- Installing dependencies for ${appPath} ---`);
    runCommand('npm install', fullPath);
}

for (const neoAppPath of neoAppPaths) {
    const fullPath = path.join(projectRoot, neoAppPath);
    console.log(`\n--- Building Neo.mjs app: ${neoAppPath} ---`);
    runCommand('npm run build-all', fullPath);
}

console.log('\nBenchmark project setup complete!');
