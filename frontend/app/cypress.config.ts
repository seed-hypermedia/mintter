import {defineConfig} from 'cypress'

export default defineConfig({
  component: {
    supportFile: './cypress/support/component.tsx',
    fixturesFolder: '.',
    viewportWidth: 1280,
    viewportHeight: 800,
    projectId: 'd3nyda',
    // specPattern: '**/*.cy.tsx',
    experimentalWebKitSupport: true,
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },

  trashAssetsBeforeRuns: true,
  retries: {
    runMode: 5,
    openMode: 0,
  },
})
