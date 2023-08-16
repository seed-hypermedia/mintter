import {PlaywrightTestConfig} from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  maxFailures: 2,
}

export default config
