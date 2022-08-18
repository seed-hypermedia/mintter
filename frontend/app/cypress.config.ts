import {defineConfig} from 'cypress'

export default defineConfig({
  component: {
    supportFile: './cypress/support/component.tsx',
    fixturesFolder: '.',
    projectId: 'd3nyda',
    // specPattern: '**/*.cy.tsx',
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
