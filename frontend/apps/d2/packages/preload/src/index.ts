import {contextBridge, ipcRenderer, shell} from 'electron'

// Add a `window.api` object inside the renderer process with the `openUrl`
// function.
contextBridge.exposeInMainWorld('api', {
  // Open an URL into the default web-browser.
  openUrl: (url: string) => shell.openExternal(url),
  openWindow: (url?: string) => ipcRenderer.invoke('new-window', url),
  getWindowId: () => ipcRenderer.invoke('print-sender-id'),
  sendCoords: (coords: Coords) => ipcRenderer.invoke('send-coords', coords),
  handleCoords: (cb) => ipcRenderer.on('set-coords', cb),
})

type Coords = {
  x: number
  y: number
}
