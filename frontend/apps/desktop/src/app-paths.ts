import {app} from 'electron'
import {mkdtempSync} from 'fs'
import os from 'os'
import path from 'path'

export const IS_PROD = process.env.NODE_ENV == 'production'
export const IS_TEST = process.env.NODE_ENV == 'test'

export const userDataPath = IS_PROD
  ? path.join(app.getPath('appData'), 'Mintter')
  : IS_TEST
  ? mkdtempSync(path.join(os.tmpdir(), 'hm-'))
  : path.join(app.getPath('appData'), process.env.VITE_DESKTOP_APPDATA!)

export function initPaths() {
  app.setPath('userData', userDataPath)
}
