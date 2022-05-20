// import * as tauriLog from 'tauri-plugin-log-api'

// export var error = loggerFactory(tauriLog.error)
// export var warn = loggerFactory(tauriLog.warn)
// export var info = loggerFactory(tauriLog.info)
// export var debug = loggerFactory(tauriLog.debug)
// export var trace = loggerFactory(tauriLog.trace)

export function startLogger() {
  // tauriLog.attachConsole().catch((err) => {
  //   error('attachConsole ERROR', err)
  // })
  // if (window) {
  //   window.addEventListener('error', (e) => error(e.message))
  // }
}

// export function loggerFactory(cb: (m: string) => Promise<void>) {
//   return function actualLogger(...args: Array<any>): Promise<void> {
//     if (args.length == 1) {
//       return cb(args[0])
//     } else {
//       let message = args
//         .map((v) => {
//           if (typeof v == 'string') {
//             return v
//           } else {
//             return JSON.stringify(v)
//           }
//         })
//         .join(', ')

//       return cb(message)
//     }
//   }
// }

var { error, warn, info, debug, trace } = console

export { error, warn, info, debug, trace }
