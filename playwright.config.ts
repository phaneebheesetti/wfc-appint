import { defineConfig, devices } from "@playwright/test"
import { config } from "dotenv"

config()

const baseURL = process.env.APP_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: "html",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  globalSetup: "./e2e/auth.setup.ts",
  projects: [
    {
      name: "auth-setup",
      testDir: "./e2e",
      testMatch: "auth-storage.setup.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium",
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: process.env.CI ? "SKIP_ENV_VALIDATION=true yarn dev" : "yarn dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    ...(process.env.CI && {
      env: {
        ...process.env,
        SKIP_ENV_VALIDATION: "true",
      },
    }),
  },
  timeout: 60_000,
  expect: { timeout: 10_000 },
})
