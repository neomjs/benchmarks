import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
    testDir      : '.',
    testMatch    : ['**/*.spec.mjs'],
    fullyParallel: false,
    workers      : 1,
    reporter     : 'list',
    use          : {
        ...devices['Desktop Chrome'],
        headless: true
    }
});
