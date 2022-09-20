import {createDraftMachine} from '@app/draft-machine'
import {
  createMainPageService,
  DraftRef,
  PublicationRef,
} from '@app/main-machine'
import {createPublicationMachine} from '@app/publication-machine'
import {ActorRefFrom, InterpreterFrom} from 'xstate'
import {createInterpreterContext} from './utils/machine-utils'

export type MainMachine = ReturnType<typeof createMainPageService>
export type MainService = InterpreterFrom<MainMachine>

var [MainProvider, useMain, createMainSelector] =
  createInterpreterContext<InterpreterFrom<MainMachine>>('Main')

export {MainProvider, useMain}

export var useLibrary = createMainSelector((state) => state.context.library)
export var useActivity = createMainSelector((state) => state.context.activity)
export var useCurrentFile = createMainSelector(
  (state) => state.context.currentFile,
)
export var usePublicationList = createMainSelector(
  (state) => state.context.publicationList,
)
export var useDraftList = createMainSelector((state) => state.context.draftList)

export var useRecents = createMainSelector((state) => state.context.recents)
export var useMainChildren = createMainSelector((state) => state.children)
export var useParams = createMainSelector((state) => state.context.params)

type FileActor = ActorRefFrom<
  ReturnType<typeof createPublicationMachine | typeof createDraftMachine>
>

export function useFileFromRef(id: string): PublicationRef | DraftRef {
  let file = createMainSelector((state) => {
    if (id.startsWith('pub') || id.startsWith('draft'))
      return state.children[id] as FileActor
  })() as FileActor

  // return useMemo(() => {
  //   if (id.startsWith('pub') || id.startsWith('draft')) {
  //     let
  //   }
  // }, [id])

  return file
}

export var useIsEditing = createMainSelector((state) => {
  /**
   * This hook controls the visibility of some parts of the UI like the topbar, the library and the hover effects.
   * We want to hide those **only** when the user is typing in the editor.
   * If the user is in another state (publication), we should show those no matter what (thats why else returns always false)
   */

  return state.matches('routes.editor.editing.typing')
})
