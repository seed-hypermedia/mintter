import {IS_PROD_DESKTOP} from '@shm/shared'
import * as legacyLogger from 'electron-log'
import {existsSync, rmSync} from 'fs'
import {join} from 'path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import {userDataPath} from './app-paths'

export const legacyLogsFilePath = legacyLogger.transports.file.getFile().path

if (existsSync(legacyLogsFilePath)) {
  // throw away legacy logs for security reasons
  rmSync(legacyLogsFilePath)
}

export const loggingDir = join(userDataPath, 'logs')

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {nodeEnv: process.env.NODE_ENV || ''},
  transports: [
    new DailyRotateFile({
      level: 'info',
      dirname: loggingDir,
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
    new DailyRotateFile({
      level: 'error',
      dirname: loggingDir,
      filename: '%DATE%.error.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '180d',
    }),
  ],
})

if (!IS_PROD_DESKTOP) {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  )
}

console.log('== Logs will be written in: ', loggingDir)

export function info(...input: any[]) {
  winstonLogger.log({level: 'info', message: JSON.stringify(input)})
}

export function debug(...input: any[]) {
  winstonLogger.log({level: 'debug', message: JSON.stringify(input)})
}

export function warn(...input: any[]) {
  winstonLogger.log({level: 'warn', message: JSON.stringify(input)})
}

export function error(...input: any[]) {
  winstonLogger.log({level: 'error', message: JSON.stringify(input)})
}

export function verbose(...input: any[]) {
  winstonLogger.log({level: 'debug', message: JSON.stringify(input)})
}

export function childLogger(context: string) {
  return {
    info(...input: any[]) {
      winstonLogger.log({
        level: 'info',
        message: JSON.stringify(input),
        meta: {context},
      })
    },
    debug(...input: any[]) {
      winstonLogger.log({
        level: 'debug',
        message: JSON.stringify(input),
        meta: {context},
      })
    },
    warn(...input: any[]) {
      winstonLogger.log({
        level: 'warn',
        message: JSON.stringify(input),
        meta: {context},
      })
    },
    error(...input: any[]) {
      winstonLogger.log({
        level: 'error',
        message: JSON.stringify(input),
        meta: {context},
      })
    },
    verbose(...input: any[]) {
      winstonLogger.log({
        level: 'debug',
        message: JSON.stringify(input),
        meta: {context},
      })
    },
  }
}
