import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: 'd3nyda',
  fileServerFolder: 'site',
  viewportWidth: 1024,
  viewportHeight: 768,
  fixturesFolder: false,
  screenshotsFolder: './cypress/snapshots/actual',
  trashAssetsBeforeRuns: true,
  retries: {
    runMode: 5,
    openMode: 0,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  }
})


