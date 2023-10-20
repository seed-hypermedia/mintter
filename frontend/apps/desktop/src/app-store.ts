import {APP_USER_DATA_PATH} from './app-paths'
import Store from 'electron-store'

export const appStore = new Store({
  name: 'AppStore',
  cwd: APP_USER_DATA_PATH,
})
