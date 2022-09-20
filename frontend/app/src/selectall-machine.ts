import {listen} from '@tauri-apps/api/event'
import {Editor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {createMachine} from 'xstate'

export function createSelectAllActor(editor: Editor) {
  return createMachine(
    {
      predictableActionArguments: true,
      id: 'select-all-machine',
      tsTypes: {} as import('./selectall-machine.typegen').Typegen0,
      initial: 'idle',
      invoke: {
        src: 'keyPressListener',
        id: 'keyPressListener',
      },
      states: {
        idle: {},
      },
    },
    {
      services: {
        keyPressListener: () => {
          let unlisten: () => void | undefined
          listen('select_all', () => {
            Editor.withoutNormalizing(editor, () => {
              ReactEditor.focus(editor)
              requestAnimationFrame(() => {
                Transforms.select(editor, [])
              })
            })
          }).then((f) => (unlisten = f))

          return () => {
            unlisten?.()
          }
        },
      },
    },
  )
}
