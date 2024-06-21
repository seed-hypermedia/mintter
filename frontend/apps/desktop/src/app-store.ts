import Store from 'electron-store'
import {userDataPath} from './app-paths'

// TODO: add types
export const appStore = new Store<Record<string, any>>({
  name: 'AppStore',
  cwd: userDataPath,
})

// TODO: add types
export const commentDraftStore = new Store<Record<string, any>>({
  name: 'CommentDraft',
  cwd: userDataPath,
})

export const secureStore = new Store<Record<string, any>>({
  name: 'SecureStore',
  cwd: userDataPath,
})
