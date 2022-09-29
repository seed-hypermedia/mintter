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
  entry?: MutableRefObject<HTMLElement>,
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

export const useCurrentBound = createMouseSelector(
  (state) => state.context.currentBound,
)

export const useCurrentTarget = createMouseSelector((state) => {
  let tMap = new Map(state.context.visibleBlocks)
  if (state.context.currentBound) {
    let target = tMap.get(state.context.currentBound[0])
    return target
  }

  return null
}, CurrentTargetCompare)

export const useHighlightRef = createMouseSelector(
  (state) => state.context.highlightRef,
)

function CurrentTargetCompare(
  prevTarget?: HTMLElement | null,
  newTarget?: HTMLElement | null,
) {
  if (prevTarget && newTarget) {
    if (prevTarget.dataset && newTarget.dataset) {
      return prevTarget.dataset?.highlight !== newTarget.dataset?.highlight
    }
  }

  return false
}
