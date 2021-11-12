import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from '../../utils/machine-utils'
import {createBookmarksMachine} from './bookmarks-machine'

const [BookmarksProvider, useBookmarksService, createBookmarksSelector] =
  createInterpreterContext<InterpreterFrom<ReturnType<typeof createBookmarksMachine>>>('Bookmarks')

export {BookmarksProvider, useBookmarksService}

export const useBookmarks = createBookmarksSelector((state) => state.context.bookmarks)
