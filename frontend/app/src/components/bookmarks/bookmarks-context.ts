import {createBookmarksMachine} from 'frontend/app/src/components/bookmarks'
import {createInterpreterContext} from 'frontend/app/src/utils/machine-utils'
import {InterpreterFrom} from 'xstate'

const [BookmarksProvider, useBookmarksService, createBookmarksSelector] =
  createInterpreterContext<InterpreterFrom<ReturnType<typeof createBookmarksMachine>>>('Bookmarks')

export {BookmarksProvider, useBookmarksService}

export const useBookmarks = createBookmarksSelector((state) => state.context.bookmarks)
