import {app} from 'electron'
import path from 'path'

export const APP_FOLDER_NAME =
  process.env.NODE_ENV != 'production' && process.env.APP_FOLDER_NAME
    ? process.env.APP_FOLDER_NAME
    : 'Mintter'

export const APP_USER_DATA_PATH = path.join(
  app.getPath('appData'),
  APP_FOLDER_NAME,
)

export function initPaths() {
  app.setPath('userData', APP_USER_DATA_PATH)
}

export function setupTests() {
  app.setPath('userData', APP_USER_DATA_PATH)
}
