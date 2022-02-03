// import {attachConsole, debug, error, info, trace, warn} from 'tauri-plugin-log-api'

export function startLogger() {
  // attachConsole()
  // if (window) {
  //   window.addEventListener('error', (e) => error(e.message))
  // }
}

const {info, error, warn, trace, debug} = console

export {info, error, warn, trace, debug}
