import {store} from './store'

const LIST_BOOKMARKS = 'listBookmarks'

export type ListBookmarksResponse = Array<string>

export function listBookmarks() {
  return store.get<Array<string>>(LIST_BOOKMARKS) || []
}

export function updateListBookmarks(list: Array<string>) {
  return store.set(LIST_BOOKMARKS, list)
}
