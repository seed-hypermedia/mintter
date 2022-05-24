import * as tauriLog from 'tauri-plugin-log-api'

export const error = (message: string) => {
  if (import.meta.env.TAURI_DEBUG) {
    tauriLog.error(message)
  } else {
    console.error(message)
  }
}

export const warn = (message: string) => {
  if (import.meta.env.TAURI_DEBUG) {
    tauriLog.warn(message)
  } else {
    console.warn(message)
  }
}

export const info = (message: string) => {
  if (import.meta.env.TAURI_DEBUG) {
    tauriLog.info(message)
  } else {
    console.log(message)
  }
}

export const debug = (message: string) => {
  if (import.meta.env.TAURI_DEBUG) {
    tauriLog.debug(message)
  } else {
    console.debug(message)
  }
}

export const trace = (message: string) => {
  if (import.meta.env.TAURI_DEBUG) {
    tauriLog.trace(message)
  } else {
    console.trace(message)
  }
}
