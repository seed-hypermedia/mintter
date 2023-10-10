import * as logger from 'electron-log'

export const logFilePath = logger.transports.file.getFile().path

console.log('== Logs will be written here: ', logFilePath)

export function log(...input: any[]) {
  console.log(...input)
  logger.log(...input)
}

export function debug(...input: any[]) {
  console.debug(...input)
  logger.debug(...input)
}

export function warn(...input: any[]) {
  console.warn(...input)
  logger.warn(...input)
}

export function error(...input: any[]) {
  console.error(...input)
  logger.error(...input)
}

export function verbose(...input: any[]) {
  console.log(...input)
  logger.verbose(...input)
}

export function silly(...input: any[]) {
  console.log(...input)
  logger.silly(...input)
}

export const childLogger = logger.create
