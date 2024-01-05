import Store from 'electron-store'
import {APP_USER_DATA_PATH} from './app-paths'

export const appStore = new Store({
  name: 'AppStore',
  cwd: APP_USER_DATA_PATH,
})

export const commentDraftStore = new Store({
  name: 'CommentDraft',
  cwd: APP_USER_DATA_PATH,
})
