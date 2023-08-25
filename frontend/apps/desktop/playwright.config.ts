import {PlaywrightTestConfig} from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './test',
  maxFailures: 2,
}

export default config
