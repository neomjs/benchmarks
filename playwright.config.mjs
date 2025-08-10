// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
    ['./custom-reporter.js']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Capture video of test runs. See https://playwright.dev/docs/videos */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Development environment
    {
      name: 'chromium-dev',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-dev',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-dev',
      use: { ...devices['Desktop Safari'] },
    },
    // Production environment
    {
      name: 'chromium-prod',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8080/dist/production/',
      },
    },
    {
      name: 'firefox-prod',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:8080/dist/production/',
      },
    },
    {
      name: 'webkit-prod',
      use: {
        ...devices['Desktop Safari'],
        baseURL: 'http://localhost:8080/dist/production/',
      },
    },
    {
      name: 'angular',
      testMatch: /angular\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4200',
      },
    },
    {
      name: 'react',
      testMatch: /react\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5174',
      },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm --prefix apps/interactive-benchmark-neo run server-start:headless',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm --prefix apps/interactive-benchmark-react run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm --prefix apps/interactive-benchmark-angular run start',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
    }
  ],
});
