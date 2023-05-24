import {EditorMode} from '@app/editor/plugin-utils'
import {mouseMachine} from '@app/mouse-machine'
import {MutableRefObject, useEffect} from 'react'
import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from './utils/machine-utils'
export type MouseInterpret = InterpreterFrom<typeof mouseMachine>

const [MouseProvider, useMouse, createMouseSelector] =
  createInterpreterContext<MouseInterpret>('Mouse')

export {MouseProvider, useMouse}

export function useBlockObserve(
  mode: EditorMode,
  entry?: MutableRefObject<HTMLElement | undefined>,
) {
  let service = useMouse()

  useEffect(() => {
    if (mode != EditorMode.Embed && mode != EditorMode.Mention) {
      if (entry && entry.current) {
        service.send({type: 'BLOCK.OBSERVE', entry: entry.current})
      }
    }
  }, [service, entry, mode])
}

export const useHoveredBlockId = createMouseSelector(
  (state) => state.context.hoveredBlockId,
)
