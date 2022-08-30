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

export var useVisitList = createMainSelector(
  (state) => state.context.activity?.getSnapshot()?.context.visitList || [],
)
type FileActor = ActorRefFrom<
  ReturnType<typeof createPublicationMachine | typeof createDraftMachine>
>

export function useFileFromRef(id: string): PublicationRef | DraftRef {
  let file = createMainSelector((state) => {
    if (id.startsWith('pub') || id.startsWith('draft'))
      return state.children[id] as FileActor
  })() as FileActor

  return file
}
