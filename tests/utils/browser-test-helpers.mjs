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
