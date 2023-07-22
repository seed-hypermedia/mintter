// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// import {contextBridge} from 'electron'

// // Add a `window.api` object inside the renderer process with the `openUrl`
// // function.
// contextBridge.exposeInMainWorld('api', {
//   // Open an URL into the default web-browser.
//   ping: (mssg: string) => {
//     console.log('PONG', mssg)
//   },
// })

export const hello = 'jello'
console.log('PRELOAD LOADED')
