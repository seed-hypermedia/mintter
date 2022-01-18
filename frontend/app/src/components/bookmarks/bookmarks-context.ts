import {createInterpreterContext} from '@app/utils/machine-utils'
import {InterpreterFrom} from 'xstate'
import {bookmarksMachine} from './bookmarks-machine'

const [BookmarksProvider, useBookmarksService, createBookmarksSelector] =
  createInterpreterContext<InterpreterFrom<typeof bookmarksMachine>>('Bookmarks')

export {BookmarksProvider, useBookmarksService}

export const useBookmarks = createBookmarksSelector((state) => state.context.bookmarks)
