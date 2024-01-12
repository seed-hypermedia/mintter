import Store from 'electron-store'
import {userDataPath} from './app-paths'

export const appStore = new Store({
  name: 'AppStore',
  cwd: userDataPath,
})

export const commentDraftStore = new Store({
  name: 'CommentDraft',
  cwd: userDataPath,
})
