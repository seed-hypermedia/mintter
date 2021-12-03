import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from '../../utils/machine-utils'
import {bookmarksMachine} from './bookmarks-machine'

const [BookmarksProvider, useBookmarksService, createBookmarksSelector] =
  createInterpreterContext<InterpreterFrom<typeof bookmarksMachine>>('Bookmarks')

export {BookmarksProvider, useBookmarksService}

export const useBookmarks = createBookmarksSelector((state) => state.context.bookmarks)
