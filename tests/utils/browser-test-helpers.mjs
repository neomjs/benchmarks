export const measurePerformanceInBrowser = (testName, action, condition, passThrough, { timeout = 30000, resolveOnTimeout = false } = {}) => {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(() => {
            try {
                if (condition(passThrough)) {
                    const endTime = performance.now();
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(endTime - startTime);
                }
            } catch (e) {
                observer.disconnect();
                clearTimeout(timeoutId);
                console.error(`Condition error in ${testName}:`, e);
                reject(e);
            }
        });

        observer.observe(document.body, {attributes: true, childList: true, subtree: true});

        const timeoutId = setTimeout(() => {
            observer.disconnect();
            if (resolveOnTimeout) {
                resolve(Infinity);
            } else {
                reject(new Error(`Benchmark timed out for "${testName}".`));
            }
        }, timeout);

        const startTime = performance.now();
        try {
            action(passThrough);
        } catch (e) {
            console.error(`Action error in ${testName}:`, e);
            observer.disconnect();
            clearTimeout(timeoutId);
            reject(e);
            return;
        }

        try {
            if (condition(passThrough)) {
                const endTime = performance.now();
                observer.disconnect();
                clearTimeout(timeoutId);
                resolve(endTime - startTime);
            }
        } catch (e) {
            observer.disconnect();
            clearTimeout(timeoutId);
            console.error(`Initial condition check error in ${testName}:`, e);
            reject(e);
        }
    });
};

export const measureUiUpdatePerformanceInBrowser = (testName, condition) => {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(() => {
            try {
                if (condition()) {
                    const endTime = performance.now();
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(endTime - startTime);
                }
            } catch (e) {
                observer.disconnect();
                clearTimeout(timeoutId);
                console.error(`Condition error in ${testName}:`, e);
                reject(e);
            }
        });

        observer.observe(document.body, {attributes: true, childList: true, subtree: true});

        const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`UI update benchmark timed out for "${testName}".`));
        }, 30000);

        const startTime = performance.now(); // Measurement starts here
        // The action (store.add) is assumed to have just happened
    });
};

/**
 * Measures UI jank by collecting frame timings over a given duration.
 * This function will be injected into the browser context.
 * @param {number} duration - The duration in milliseconds to measure jank.
 * @returns {Promise<{averageFps: number, frameCount: number, longFrameCount: number, totalTime: number}>}
 */
export const measureJankInBrowser = (duration) => {
    return new Promise(resolve => {
        const frameTimes = [];
        let longFrameCount = 0;
        let startTime;

        function frame(time) {
            if (startTime === undefined) {
                startTime = time;
            }

            const elapsed = time - startTime;
            frameTimes.push(time);

            if (elapsed < duration) {
                requestAnimationFrame(frame);
            } else {
                // Start from the second frame to calculate deltas
                for (let i = 1; i < frameTimes.length; i++) {
                    const delta = frameTimes[i] - frameTimes[i - 1];
                    // A long frame is arbitrarily defined as > 50ms (~20 FPS threshold)
                    // This indicates significant main-thread blocking.
                    if (delta > 50) {
                        longFrameCount++;
                    }
                }

                const totalTime = frameTimes[frameTimes.length - 1] - frameTimes[0];
                // We have frameTimes.length - 1 frame intervals
                const averageFps = totalTime > 0 ? (frameTimes.length - 1) / (totalTime / 1000) : 0;

                resolve({
                    averageFps: Math.round(averageFps),
                    frameCount: frameTimes.length,
                    longFrameCount,
                    totalTime: Math.round(totalTime)
                });
            }
        }

        requestAnimationFrame(frame);
    });
};

/**
 * @summary Measures main-thread responsiveness (max RAF frame delta, long frames >50ms, LongTask blocking)
 * alongside Total Time to Valid State (TVS) while `action(passThrough)` settles `condition(passThrough)`.
 * @param {string} testName - Identifier for error and timeout reporting.
 * @param {Function} action - Synchronous or async function that triggers the UI mutation.
 * @param {Function} condition - Predicate returning true once the DOM reaches valid target state.
 * @param {*} [passThrough] - Optional payload forwarded to `action` and `condition`.
 * @param {Object} [options] - Timeout configuration (`{ timeout = 30000 }`).
 * @returns {Promise<{tvsMs: number, maxRafDeltaMs: number, longFrameCount: number, longTaskCount: number|null, longTaskTotalBlockingMs: number|null, frameCount: number}>}
 */
export const measureMainThreadProbeInBrowser = (testName, action, condition, passThrough, { timeout = 30000 } = {}) => {
    return new Promise((resolve, reject) => {
        const frameDeltas = [];
        let lastFrameTime = performance.now();
        let rafActive = true;
        const longTaskSupported = typeof PerformanceObserver !== 'undefined' &&
            Array.isArray(PerformanceObserver.supportedEntryTypes) &&
            PerformanceObserver.supportedEntryTypes.includes('longtask');
        let longTaskCount = longTaskSupported ? 0 : null;
        let longTaskTotalBlockingMs = longTaskSupported ? 0 : null;
        let longTaskObserver = null;

        if (longTaskSupported) {
            longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    longTaskCount++;
                    longTaskTotalBlockingMs += Math.max(0, entry.duration - 50);
                }
            });
            longTaskObserver.observe({ type: 'longtask', buffered: false });
        }

        function tick(now) {
            if (!rafActive) return;
            frameDeltas.push(now - lastFrameTime);
            lastFrameTime = now;
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        const cleanup = () => {
            rafActive = false;
            observer.disconnect();
            longTaskObserver?.disconnect();
            clearTimeout(timeoutId);
        };

        const finish = (endTime) => {
            const finalGap = endTime - lastFrameTime;
            if (finalGap > 0) frameDeltas.push(finalGap);
            cleanup();
            const maxRafDeltaMs = frameDeltas.length > 0 ? Math.max(...frameDeltas) : 0;
            const longFrameCount = frameDeltas.filter(d => d > 50).length;
            resolve({
                tvsMs                  : Math.round((endTime - startTime) * 100) / 100,
                maxRafDeltaMs          : Math.round(maxRafDeltaMs * 100) / 100,
                longFrameCount,
                longTaskCount,
                longTaskTotalBlockingMs: longTaskTotalBlockingMs !== null ? Math.round(longTaskTotalBlockingMs * 100) / 100 : null,
                frameCount             : frameDeltas.length
            });
        };

        const observer = new MutationObserver(() => {
            try {
                if (condition(passThrough)) {
                    finish(performance.now());
                }
            } catch (e) {
                cleanup();
                reject(e);
            }
        });

        observer.observe(document.body, { attributes: true, childList: true, subtree: true });

        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error(`Main-thread probe timed out for "${testName}".`));
        }, timeout);

        const startTime = performance.now();
        lastFrameTime = startTime;

        try {
            action(passThrough);
            if (condition(passThrough)) {
                finish(performance.now());
            }
        } catch (e) {
            cleanup();
            reject(e);
        }
    });
};

/**
 * @summary Parses `NEO_USE_VDOM_WORKER` (`'true'` | `'false'`) into a boolean arm override or `undefined`.
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {boolean|undefined}
 */
export const parseNeoUseVdomWorkerEnv = (env = process.env) => {
    const raw = env.NEO_USE_VDOM_WORKER?.trim();
    if (!raw) return undefined;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    throw new Error(`Invalid NEO_USE_VDOM_WORKER="${raw}". Expected "true" or "false".`);
};

/**
 * @summary Intercepts `neo-config.json` requests before `MicroLoader.mjs` boots so `useVdomWorker` matches the requested arm,
 * and applies optional CDP Main-thread CPU throttling (`NEO_CPU_THROTTLE`; Blink restricts `Emulation.setCPUThrottlingRate` to page targets).
 * @param {import('@playwright/test').Page} page
 * @param {boolean|undefined} [expected=parseNeoUseVdomWorkerEnv()]
 * @returns {Promise<boolean|undefined>}
 */
export const configureNeoVdomWorker = async (page, expected = parseNeoUseVdomWorkerEnv()) => {
    const throttleRaw  = process.env.NEO_CPU_THROTTLE?.trim();
    const throttleRate = throttleRaw ? Number(throttleRaw) : 1;
    if (Number.isFinite(throttleRate) && throttleRate > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttleRate });
    }

    if (typeof expected !== 'boolean') return undefined;

    await page.route('**/neo-config.json', async (route) => {
        const response = await route.fetch();
        const json     = await response.json();
        json.useVdomWorker = expected;
        await route.fulfill({ response, json });
    });

    return expected;
};

/**
 * @summary Verifies that `Neo.config.useVdomWorker` and the live `Neo.worker.Manager` VDom worker match the requested arm.
 * @param {import('@playwright/test').Page} page
 * @param {boolean|undefined} [expected=parseNeoUseVdomWorkerEnv()]
 * @returns {Promise<void>}
 */
export const assertNeoVdomWorkerTopology = async (page, expected = parseNeoUseVdomWorkerEnv()) => {
    if (typeof expected !== 'boolean') return;

    const topology = await page.evaluate(() => ({
        useVdomWorker: Boolean(window.Neo?.config?.useVdomWorker),
        hasVdomWorker: Boolean(
            window.Neo?.worker?.Manager?.getWorker?.('vdom') ||
            window.Neo?.worker?.Manager?.workers?.vdom?.worker
        )
    }));

    if (topology.useVdomWorker !== expected || topology.hasVdomWorker !== expected) {
        throw new Error(
            `Neo worker topology mismatch: expected useVdomWorker=${expected}, got ${JSON.stringify(topology)}`
        );
    }
};

/**
 * @summary Browser-side installer exposing zero-allocation `startWorkerMessageProbe()` and `stopWorkerMessageProbe()` counters on `Neo.worker.Manager`.
 */
export const installWorkerMessageProbeInBrowser = () => {
    const recordInbound = (manager, event) => {
        const state = manager.__neoBenchmarkProbeState;
        if (!state) return;

        state.inboundMessages++;
        const data    = event?.data;
        const payload = data?.action === 'reply' ? data.data : data;
        const isDomUpdate = data?.action === 'updateVdom' ||
            (data?.action === 'reply' && Boolean(payload?.updateVdom || payload?.autoMount));

        if (isDomUpdate) {
            state.domUpdateFlights++;
            const deltas = data?.action === 'updateVdom' ? data.deltas : payload?.deltas;
            if (Array.isArray(deltas)) {
                state.totalDeltas += deltas.length;
            }
        }
        if (payload?.vnodes || payload?.vnode) {
            state.vnodeRelayMessages++;
        }
    };

    const attachWorkerListeners = (manager) => {
        for (const entry of Object.values(manager.workers || {})) {
            const target = entry?.worker?.port || entry?.worker;
            if (target && !target.__neoBenchmarkInboundWrapped) {
                target.addEventListener('message', (event) => recordInbound(manager, event));
                target.__neoBenchmarkInboundWrapped = true;
            }
        }
    };

    const ensureWrapped = () => {
        const manager = window.Neo?.worker?.Manager;
        if (!manager) {
            return null;
        }

        attachWorkerListeners(manager);

        if (manager.__neoBenchmarkProbeInstalled) {
            return manager;
        }

        const origSendMessage = manager.sendMessage.bind(manager);
        manager.__neoBenchmarkProbeState = null;

        manager.sendMessage = function(dest, opts, transfer) {
            const state = manager.__neoBenchmarkProbeState;
            if (state) {
                state.outboundMessages++;
                if (opts?.data?.vnodes || opts?.data?.vnode) {
                    state.vnodeRelayMessages++;
                }
            }
            return origSendMessage(dest, opts, transfer);
        };

        manager.__neoBenchmarkProbeInstalled = true;
        return manager;
    };

    window.startWorkerMessageProbe = () => {
        const manager = ensureWrapped();
        if (!manager) {
            throw new Error('Neo.worker.Manager is not available for startWorkerMessageProbe()');
        }
        manager.__neoBenchmarkProbeState = {
            startTime         : performance.now(),
            inboundMessages   : 0,
            outboundMessages  : 0,
            domUpdateFlights  : 0,
            totalDeltas       : 0,
            vnodeRelayMessages: 0
        };
    };

    window.stopWorkerMessageProbe = () => {
        const manager = ensureWrapped();
        const state   = manager?.__neoBenchmarkProbeState;
        if (manager) {
            manager.__neoBenchmarkProbeState = null;
        }
        if (!state) {
            return {
                elapsedMs              : 0,
                inboundMessages        : 0,
                outboundMessages       : 0,
                totalMainWorkerMessages: 0,
                domUpdateFlights       : 0,
                flightsPerSec          : 0,
                totalDeltas            : 0,
                avgDeltasPerFlight     : 0,
                vnodeRelayMessages     : 0
            };
        }
        const elapsedMs = Math.max(1, performance.now() - state.startTime);
        const totalMainWorkerMessages = state.inboundMessages + state.outboundMessages;
        return {
            elapsedMs              : Math.round(elapsedMs * 100) / 100,
            inboundMessages        : state.inboundMessages,
            outboundMessages       : state.outboundMessages,
            totalMainWorkerMessages,
            domUpdateFlights       : state.domUpdateFlights,
            flightsPerSec          : Math.round((state.domUpdateFlights / (elapsedMs / 1000)) * 100) / 100,
            totalDeltas            : state.totalDeltas,
            avgDeltasPerFlight     : state.domUpdateFlights > 0
                ? Math.round((state.totalDeltas / state.domUpdateFlights) * 100) / 100
                : 0,
            vnodeRelayMessages     : state.vnodeRelayMessages
        };
    };
};
