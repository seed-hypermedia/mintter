/* eslint-disable @typescript-eslint/no-var-requires */
import type {Config} from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  moduleNameMapper: require('tsconfig-paths-jest')(require('./tsconfig.json')),
}

export default config
