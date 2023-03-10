import path from 'path'

import {dirname} from 'path'
import {fileURLToPath} from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * @type {import('next').NextConfig}
 */
export default {
  // Append the default value with md extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    runtime: 'experimental-edge',
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // turbotrace: {
    //   logDetail: true,
    //   logAll: true,

    // control the log level of the turbotrace, default is `error`
    // logLevel?:
    // | 'bug'
    // | 'fatal'
    // | 'error'
    // | 'warning'
    // | 'hint'
    // | 'note'
    // | 'suggestions'
    // | 'info',

    // control if the log of turbotrace should contain the details of the analysis, default is `false`
    // logDetail?: boolean

    // show all log messages without limit
    // turbotrace only show 1 log message for each categories by default
    // logAll?: boolean

    // control the context directory of the turbotrace
    // files outside of the context directory will not be traced
    // set the `experimental.outputFileTracingRoot` has the same effect
    // if the `experimental.outputFileTracingRoot` and this option are both set, the `experimental.turbotrace.contextDirectory` will be used
    // contextDirectory?: string

    // if there is `process.cwd()` expression in your code, you can set this option to tell `turbotrace` the value of `process.cwd()` while tracing.
    // for example the require(process.cwd() + '/package.json') will be traced as require('/path/to/cwd/package.json')
    // processCwd?: string

    // control the maximum memory usage of the `turbotrace`, in `MB`, default is `6000`.
    // memoryLimit?: number
    // },
  },
  output: 'standalone',
}
