const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: 'http://app:5000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'android-web', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-web', use: { ...devices['iPhone 15'] } }
  ]
});
