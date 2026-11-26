import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    assertNeoVdomWorkerTopology,
    isCellInViewportInBrowser,
    measureMainThreadProbeInBrowser
} from './utils/browser-test-helpers.mjs';
import {
    buildBenchmarkConfig,
    prepareSafeResultsDir,
    resolveSafeResultsDir
} from '../scripts/run-benchmarks.mjs';
import {
    OVERLAY_MARKER_FILE,
    PROVENANCE_REL_PATH,
    assertSupportedNodeVersion,
    buildNeoApp,
    overlayLocalEngine,
    prepareNeoAppForPublishedInstall,
    writeEngineProvenance
} from '../scripts/setup.mjs';

test.describe('Benchmark harness measurement, isolation, and setup contracts (#15)', () => {
    test('RA-1: buffered offscreen cell at 18 ms does not end 2D TVS before entering viewport at 60 ms', async ({ page }) => {
        await page.setContent(`
            <div class="neo-grid-view" style="position:relative;width:600px;height:300px;overflow:hidden;"></div>
        `);
        await page.addScriptTag({
            content: `
                window.isCellInViewport       = ${isCellInViewportInBrowser.toString()};
                window.measureMainThreadProbe = ${measureMainThreadProbeInBrowser.toString()};
            `
        });

        const replay = await page.evaluate(async () => {
            const vScroller = document.querySelector('.neo-grid-view');
            let mountedOffscreen = false;
            let visibleWhenMounted = null;

            const probe = await window.measureMainThreadProbe('buffered-2d-replay', () => {
                // Mount target cell offscreen horizontally (+900 px) and vertically (+450 px) at 18 ms
                setTimeout(() => {
                    const row = document.createElement('div');
                    row.className = 'neo-grid-row';
                    row.setAttribute('data-row-id', '5000');
                    row.style.cssText = 'position:absolute;top:450px;left:0;height:32px;width:2000px;';

                    const cell = document.createElement('div');
                    cell.className = 'neo-grid-cell';
                    cell.setAttribute('data-field', 'number30');
                    cell.style.cssText = 'position:absolute;left:900px;top:0;width:100px;height:32px;';
                    cell.textContent = '42';

                    row.appendChild(cell);
                    vScroller.appendChild(row);
                    mountedOffscreen = true;
                    visibleWhenMounted = window.isCellInViewport(vScroller, 5000, 'number30');
                }, 18);

                // Translate row + cell into the visible viewport at 60 ms (without adding child nodes)
                setTimeout(() => {
                    const row  = vScroller.querySelector('.neo-grid-row[data-row-id="5000"]');
                    const cell = row.querySelector('.neo-grid-cell[data-field="number30"]');
                    row.style.transform  = 'translate3d(-900px, -450px, 0px)';
                    cell.style.left      = '900px';
                }, 60);
            }, () => window.isCellInViewport(vScroller, 5000, 'number30'));

            return {
                mountedOffscreen,
                visibleWhenMounted,
                visibleAtEnd: window.isCellInViewport(vScroller, 5000, 'number30'),
                tvsMs       : probe.tvsMs
            };
        });

        expect(replay.mountedOffscreen).toBe(true);
        expect(replay.visibleWhenMounted).toBe(false);
        expect(replay.visibleAtEnd).toBe(true);
        expect(replay.tvsMs).toBeGreaterThanOrEqual(55);
    });

    test('RA-1 & RA-3: live BigData buffer rejects offscreen buffered cells until scrolled into viewport and records engineProvenance', async ({ page }) => {
        await page.addInitScript({
            content: `window.isCellInViewport = ${isCellInViewportInBrowser.toString()};`
        });
        await page.goto('/apps/bigdata/');
        await page.waitForFunction(() => {
            const grid      = document.querySelector('[role="grid"]');
            const vScroller = document.querySelector('.neo-grid-view');
            const firstCell = vScroller?.querySelector('.neo-grid-row[data-row-id="0"] .neo-grid-cell[data-field="firstname"]');
            return grid?.getAttribute('aria-rowcount') === '1001' &&
                   Boolean(firstCell && firstCell.textContent.trim().length > 0);
        });

        const topology = await assertNeoVdomWorkerTopology(page);
        expect(topology.engineProvenance).toBeTruthy();
        expect(topology.engineProvenance.version).toBe('14.0.0');
        expect(['npm-package', 'local-overlay']).toContain(topology.engineProvenance.source);

        const bufferCheck = await page.evaluate(async () => {
            const vScroller    = document.querySelector('.neo-grid-view');
            const hScroller    = document.querySelector('.neo-grid-horizontal-scrollbar');
            const mountedCells = Array.from(vScroller.querySelectorAll('.neo-grid-row[data-row-id] .neo-grid-cell[data-field]'));
            const viewRect     = vScroller.getBoundingClientRect();

            const offscreenRowEl = mountedCells.find(cell => {
                const r = cell.getBoundingClientRect();
                return cell.getAttribute('data-field') === 'firstname' &&
                       cell.textContent.trim().length > 0 &&
                       r.top >= viewRect.bottom + 4;
            });
            const offscreenColEl = mountedCells.find(cell => {
                const r     = cell.getBoundingClientRect();
                const rowId = cell.closest('.neo-grid-row')?.getAttribute('data-row-id');
                return rowId === '0' &&
                       cell.textContent.trim().length > 0 &&
                       r.left >= viewRect.right + 4;
            });

            if (!offscreenRowEl || !offscreenColEl) {
                return { foundBufferedOffscreen: false, mountedCount: mountedCells.length };
            }

            const targetRowId = offscreenRowEl.closest('.neo-grid-row').getAttribute('data-row-id');
            const targetField = offscreenColEl.getAttribute('data-field');

            const row0Visible           = window.isCellInViewport(vScroller, 0, 'firstname');
            const offscreenRowAccepted  = window.isCellInViewport(vScroller, targetRowId, 'firstname');
            const offscreenColAccepted  = window.isCellInViewport(vScroller, 0, targetField);

            // Scroll the offscreen buffered row + column into the visible viewport and verify acceptance
            const sampleRow  = vScroller.querySelector('.neo-grid-row[data-row-id]');
            const rowHeight  = sampleRow ? (parseFloat(sampleRow.style.height) || sampleRow.offsetHeight || 32) : 32;
            const colMatch   = /^number(\d+)$/.exec(targetField);
            const targetLeft = colMatch ? Math.max(0, 760 + (Number(colMatch[1]) - 7) * 100) : 400;

            const probe = await new Promise((resolve, reject) => {
                const start = performance.now();
                vScroller.scrollTop = Number(targetRowId) * rowHeight;
                if (hScroller) {
                    hScroller.scrollLeft = targetLeft;
                }
                const check = () => {
                    if (window.isCellInViewport(vScroller, targetRowId, targetField)) {
                        resolve({ settledVisible: true, elapsedMs: performance.now() - start });
                        return;
                    }
                    if (performance.now() - start > 5000) {
                        reject(new Error(`Scrolled buffered cell (${targetRowId}, ${targetField}) did not enter viewport within 5s`));
                        return;
                    }
                    requestAnimationFrame(check);
                };
                requestAnimationFrame(check);
            });

            return {
                foundBufferedOffscreen: true,
                row0Visible,
                offscreenRowAccepted,
                offscreenColAccepted,
                settledVisible        : probe.settledVisible
            };
        });

        expect(bufferCheck.foundBufferedOffscreen).toBe(true);
        expect(bufferCheck.row0Visible).toBe(true);
        expect(bufferCheck.offscreenRowAccepted).toBe(false);
        expect(bufferCheck.offscreenColAccepted).toBe(false);
        expect(bufferCheck.settledVisible).toBe(true);
    });

    test('RA-2: runner isolates 1x vs 4x CPU regimes, honors --bucket-suffix on single-arm runs, and confines result paths', async () => {
        const cwd = '/workspace/benchmarks';

        // 1. Single-arm 4x run honors --bucket-suffix and never collides with 1x
        const oneArm4x = buildBenchmarkConfig(
            ['--framework=neo', '--suite=big-data', '--vdom-worker=true', '--cpu-throttle=4', '--bucket-suffix=-cpu4x'],
            {},
            cwd
        );
        const oneArm1x = buildBenchmarkConfig(
            ['--framework=neo', '--suite=big-data', '--vdom-worker=true', '--cpu-throttle=1'],
            { NEO_CPU_THROTTLE: '4' }, // Inherited 4x in parent env must be overridden by explicit --cpu-throttle=1
            cwd
        );
        expect(oneArm4x.resolveSingleArmTarget('neo', 'big-data').resultBucket).toBe('neo-vdom-worker-cpu4x');
        expect(oneArm1x.resolveSingleArmTarget('neo', 'big-data').resultBucket).toBe('neo-vdom-worker');
        expect(oneArm1x.buildChildEnv('neo', 'big-data', true).NEO_CPU_THROTTLE).toBe('1');
        expect(oneArm4x.buildChildEnv('neo', 'big-data', true).NEO_CPU_THROTTLE).toBe('4');

        // 2. Single-arm and interleaved 4x runs (with or without --result-bucket) auto-isolate under -cpu4x
        const autoSuffix4x = buildBenchmarkConfig(
            ['--framework=neo', '--suite=big-data', '--vdom-worker=false', '--cpu-throttle=4'],
            {},
            cwd
        );
        expect(autoSuffix4x.resolveSingleArmTarget('neo', 'big-data').resultBucket).toBe('neo-app-worker-cpu4x');

        const customSingle1x = buildBenchmarkConfig(
            ['--framework=neo', '--suite=big-data', '--result-bucket=trialA', '--cpu-throttle=1'],
            {},
            cwd
        );
        const customSingle4x = buildBenchmarkConfig(
            ['--framework=neo', '--suite=big-data', '--result-bucket=trialA', '--cpu-throttle=4'],
            {},
            cwd
        );
        expect(customSingle1x.resolveSingleArmTarget('neo', 'big-data').resultBucket).toBe('trialA');
        expect(customSingle4x.resolveSingleArmTarget('neo', 'big-data').resultBucket).toBe('trialA-cpu4x');

        const customInterleaved1x = buildBenchmarkConfig(
            ['--framework=neo', '--suite=big-data', '--interleave-vdom-worker', '--result-bucket=trialA', '--cpu-throttle=1'],
            {},
            cwd
        );
        const customInterleaved4x = buildBenchmarkConfig(
            ['--framework=neo', '--suite=big-data', '--interleave-vdom-worker', '--result-bucket=trialA', '--cpu-throttle=4'],
            {},
            cwd
        );
        expect(customInterleaved1x.resolveInterleavedTargets('big-data').trueBucket).toBe('trialA-vdom-worker');
        expect(customInterleaved1x.resolveInterleavedTargets('big-data').falseBucket).toBe('trialA-app-worker');
        expect(customInterleaved4x.resolveInterleavedTargets('big-data').trueBucket).toBe('trialA-vdom-worker-cpu4x');
        expect(customInterleaved4x.resolveInterleavedTargets('big-data').falseBucket).toBe('trialA-app-worker-cpu4x');

        // 3. Custom --result-bucket path traversal AND symlink escapes are rejected before fs.emptyDir
        for (const badBucket of ['..', '../escape', '/tmp/outside', 'nested/sub', '.']) {
            expect(() => resolveSafeResultsDir('/workspace/benchmarks/test-results-data', badBucket, 'big-data')).toThrow();
            expect(() => buildBenchmarkConfig([`--result-bucket=${badBucket}`], {}, cwd)).toThrow();
        }
        expect(() => buildBenchmarkConfig(['--bucket-suffix=/../escape'], {}, cwd)).toThrow();
        expect(() => buildBenchmarkConfig(['--cpu-throttle=0'], {}, cwd)).toThrow();

        const tmpSandbox  = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-bench-symlink-'));
        const resultsRoot = path.join(tmpSandbox, 'test-results-data');
        const outsideDir  = path.join(tmpSandbox, 'outside-keep');
        const sentinel    = path.join(outsideDir, 'must-survive.txt');
        try {
            fs.mkdirSync(resultsRoot, { recursive: true });
            fs.mkdirSync(outsideDir, { recursive: true });
            fs.writeFileSync(sentinel, 'preserve-me');

            // Case A: bucket itself is a symlink pointing outside resultsRoot
            fs.symlinkSync(outsideDir, path.join(resultsRoot, 'linked-bucket'));
            expect(() => resolveSafeResultsDir(resultsRoot, 'linked-bucket', 'big-data')).toThrow(/symbolic link|out-of-root/i);
            await expect(prepareSafeResultsDir(resultsRoot, 'linked-bucket', 'big-data')).rejects.toThrow(/symbolic link|out-of-root/i);

            // Case B: suite subdirectory is a symlink pointing outside resultsRoot
            fs.mkdirSync(path.join(resultsRoot, 'real-bucket'), { recursive: true });
            fs.symlinkSync(outsideDir, path.join(resultsRoot, 'real-bucket', 'big-data'));
            expect(() => resolveSafeResultsDir(resultsRoot, 'real-bucket', 'big-data')).toThrow(/symbolic link|out-of-root/i);
            await expect(prepareSafeResultsDir(resultsRoot, 'real-bucket', 'big-data')).rejects.toThrow(/symbolic link|out-of-root/i);

            expect(fs.existsSync(sentinel)).toBe(true);
        } finally {
            fs.rmSync(tmpSandbox, { recursive: true, force: true });
        }
    });

    test('RA-3: setup enforces Node >= 24, preserves prior dist/production provenance on failed rebuild, and aligns REPRODUCIBILITY browsers', async () => {
        expect(() => assertSupportedNodeVersion('20.11.0')).toThrow(/Node\.js >= 24\.0\.0/);
        expect(() => assertSupportedNodeVersion('24.0.0')).not.toThrow();

        const guideText = fs.readFileSync(path.resolve(process.cwd(), 'REPRODUCIBILITY.md'), 'utf8');
        expect(guideText).toContain('npx playwright install\n');

        const tmpRoot      = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-bench-setup-'));
        const fakeSource   = path.join(tmpRoot, 'neo-source');
        const fakeApp      = path.join(tmpRoot, 'app');
        const targetNeoDir = path.join(fakeApp, 'node_modules', 'neo.mjs');

        try {
            fs.mkdirSync(path.join(fakeSource, 'src', 'worker'), { recursive: true });
            fs.writeFileSync(path.join(fakeSource, 'src', 'Neo.mjs'), '// overlay Neo.mjs\n');
            fs.writeFileSync(path.join(fakeSource, 'src', 'worker', 'Manager.mjs'), '// overlay worker Manager\n');
            fs.writeFileSync(path.join(fakeSource, 'package.json'), JSON.stringify({ name: 'neo.mjs', version: '14.0.0' }));

            // 1. Clean published build writes npm-package provenance to dist/production
            fs.mkdirSync(path.join(targetNeoDir, 'src', 'worker'), { recursive: true });
            fs.writeFileSync(path.join(targetNeoDir, 'src', 'worker', 'Manager.mjs'), '// published npm worker Manager\n');
            fs.writeFileSync(path.join(targetNeoDir, 'package.json'), JSON.stringify({ name: 'neo.mjs', version: '14.0.0' }));
            fs.mkdirSync(path.join(fakeApp, 'dist', 'production'), { recursive: true });

            const initialPubProv = buildNeoApp(fakeApp, {
                enginePath : null,
                buildRunner: () => {}
            });
            expect(initialPubProv.source).toBe('npm-package');

            // 2. Failed overlay rebuild must NOT stamp existing dist/production with the unbuilt overlay source
            expect(() => buildNeoApp(fakeApp, {
                enginePath : fakeSource,
                buildRunner: () => {
                    throw new Error('simulated build-all failure');
                }
            })).toThrow(/simulated build-all failure/);

            const prodProvAfterFailedBuild = JSON.parse(
                fs.readFileSync(path.join(fakeApp, 'dist', 'production', PROVENANCE_REL_PATH), 'utf8')
            );
            expect(prodProvAfterFailedBuild.source).toBe('npm-package');
            expect(prodProvAfterFailedBuild.overlaid).toBe(false);

            // 3. Successful overlay rebuild updates dist/production provenance to local-overlay
            const overlaidProv = buildNeoApp(fakeApp, {
                enginePath : fakeSource,
                buildRunner: () => {}
            });
            expect(overlaidProv.source).toBe('local-overlay');
            expect(overlaidProv.overlaid).toBe(true);
            expect(fs.existsSync(path.join(targetNeoDir, OVERLAY_MARKER_FILE))).toBe(true);

            // 4. Switching back to published setup removes the overlaid node_modules/neo.mjs tree before npm install
            const removed = prepareNeoAppForPublishedInstall(fakeApp);
            expect(removed).toBe(true);
            expect(fs.existsSync(targetNeoDir)).toBe(false);

            // 5. Fresh npm install + build writes clean published provenance
            fs.mkdirSync(path.join(targetNeoDir, 'src', 'worker'), { recursive: true });
            fs.writeFileSync(path.join(targetNeoDir, 'src', 'worker', 'Manager.mjs'), '// published npm worker Manager\n');
            fs.writeFileSync(path.join(targetNeoDir, 'package.json'), JSON.stringify({ name: 'neo.mjs', version: '14.0.0' }));
            const publishedProv = buildNeoApp(fakeApp, {
                enginePath : null,
                buildRunner: () => {}
            });
            expect(publishedProv.source).toBe('npm-package');
            expect(publishedProv.overlaid).toBe(false);
            expect(publishedProv.workerManagerSha256).not.toBe(overlaidProv.workerManagerSha256);

            // 6. Interrupted overlay (failure mid-copy AFTER modifying src/ files) already wrote .neo-engine-overlay.json
            // BEFORE modifying files, so same-version published restore purges the dirty tree instead of mislabeling it npm-package
            let copiedSrc = false;
            expect(() => overlayLocalEngine(fakeSource, fakeApp, {
                copyImpl: (src, dst, opts) => {
                    if (!copiedSrc) {
                        copiedSrc = true;
                        fs.cpSync(src, dst, opts);
                        return;
                    }
                    throw new Error('simulated mid-overlay interruption after src/ modified');
                }
            })).toThrow(/simulated mid-overlay interruption/);

            // Verify src/ was already modified to local source AND marker is already present with status: 'in-progress'
            expect(fs.readFileSync(path.join(targetNeoDir, 'src', 'worker', 'Manager.mjs'), 'utf8')).toContain('overlay worker Manager');
            expect(fs.existsSync(path.join(targetNeoDir, OVERLAY_MARKER_FILE))).toBe(true);
            expect(JSON.parse(fs.readFileSync(path.join(targetNeoDir, OVERLAY_MARKER_FILE), 'utf8')).status).toBe('in-progress');
            expect(writeEngineProvenance(fakeApp).source).toBe('local-overlay');

            // Next published setup purges the interrupted overlay so npm restores clean published files
            expect(prepareNeoAppForPublishedInstall(fakeApp)).toBe(true);
            expect(fs.existsSync(targetNeoDir)).toBe(false);
        } finally {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        }
    });
});
