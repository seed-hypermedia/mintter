import {useMachine} from '@xstate/react'
import {useEffect} from 'react'
import {assign, setup} from 'xstate'

export function useRangeSelection() {
  const [state, send, actor] = useMachine(machine)

  useEffect(function rangeSelectionEffect() {
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mousedown', handleMouseDown(true))
    document.addEventListener('touchstart', handleMouseDown(true))
    document.addEventListener('mouseup', handleMouseDown(false))
    document.addEventListener('touchend', handleMouseDown(false))

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mousedown', handleMouseDown(true))
      document.removeEventListener('touchstart', handleMouseDown(true))
      document.removeEventListener('mouseup', handleMouseDown(false))
      document.removeEventListener('touchend', handleMouseDown(false))
    }
  }, [])

  function handleSelectionChange(e: any) {
    actor.send({type: 'SELECT'})
  }

  function handleMouseDown(mouseDown: boolean) {
    return function handleMouseDown(e: any) {
      console.log('== useRangeSelection handleMouseDown', mouseDown)
      actor.send({type: mouseDown ? 'MOUSEDOWN' : 'MOUSEUP'})
    }
  }

  return [state, send, actor]
}

const defaultContext = {
  selection: null,
  blockId: '',
  rangeStart: null,
  rangeEnd: null,
  mouseDown: false,
}

const machine = setup({
  types: {
    context: defaultContext as {
      selection: Selection | null
      blockId: string
      rangeStart: number | null
      rangeEnd: number | null
      mouseDown: boolean
    },
    events: {} as
      | {type: 'SELECT'}
      | {type: 'CREATE_COMMENT'}
      | {type: 'COMMENT_CANCEL'}
      | {type: 'COMMENT_SUBMIT'}
      | {type: 'MOUSEDOWN'}
      | {type: 'MOUSEUP'},
  },
  actions: {
    setMouse: assign(({context, event}) => {
      return {
        ...context,
        mouseDown: event.type == 'MOUSEDOWN',
      }
    }),
    setRange: assign(() => {
      let sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const {anchorNode, anchorOffset, focusNode, focusOffset} = sel
        const anchorBlockId = getParentElId(anchorNode)
        const focusBlockId = getParentElId(focusNode)
        const anchorRangeOffset = getRangeOffset(anchorNode)
        const focusRangeOffset = getRangeOffset(focusNode)
        if (focusBlockId !== anchorBlockId) {
          console.log(
            '=== SELECTION === invalid selection, probably multiple blocks selected.',
          )
          return defaultContext
        }
        const blockId = focusBlockId
        const anchorRange = anchorRangeOffset + anchorOffset
        const focusRange = focusRangeOffset + focusOffset
        if (anchorRange === focusRange) {
          console.log('=== SELECTION === empty range not supported')
          return defaultContext
        }
        const rangeStart = Math.min(anchorRange, focusRange)
        const rangeEnd = Math.max(anchorRange, focusRange)
        // const blockRef = `${blockId}[${rangeStart}:${rangeEnd}]`
        console.log('=== SELECTION === ', {
          blockId,
          rangeStart,
          rangeEnd,
        })
        return {
          ...defaultContext,
          selection: sel,
          blockId,
          rangeStart,
          rangeEnd,
        }
      }
    }),
    clearContext: assign(() => defaultContext),
  },
  schemas: {
    events: {
      SELECT: {
        type: 'object',
        properties: {},
      },
      CREATE_COMMENT: {
        type: 'object',
        properties: {},
      },
      COMMENT_CANCEL: {
        type: 'object',
        properties: {},
      },
      COMMENT_SUBMIT: {
        type: 'object',
        properties: {},
      },
    },
  },
  guards: {},
}).createMachine({
  context: {
    selection: null,
    blockId: '',
    rangeStart: null,
    rangeEnd: null,
    mouseDown: false,
  },
  id: 'Range Selection',
  initial: 'idle',
  states: {
    idle: {
      on: {
        SELECT: {
          target: 'active',
        },
      },
    },
    active: {
      initial: 'selecting',
      states: {
        selecting: {
          after: {
            '300': {
              target: 'selected',
            },
          },
          on: {
            SELECT: {
              target: 'selecting',
              reenter: true,
            },
          },
        },
        selected: {
          entry: ['setRange'],
          on: {
            SELECT: {
              target: 'selecting',
              action: ['clearContext'],
            },
            CREATE_COMMENT: {
              target: 'commenting',
            },
          },
        },
        commenting: {
          on: {
            COMMENT_SUBMIT: {
              target: '#Range Selection.idle',
            },
            COMMENT_CANCEL: {
              target: 'selected',
            },
          },
        },
      },
    },
  },
  on: {
    MOUSEDOWN: {
      actions: ['setMouse'],
    },
    MOUSEUP: {
      actions: ['setMouse'],
    },
  },
})

function getParentElId(el: Node | null) {
  if (!el) return null
  // @ts-expect-error - this is a HTMLElement but TS says Node
  if (el.id) return el.id
  if (!el.parentElement) return null
  return getParentElId(el.parentElement)
}

function getRangeOffset(el: Node | null) {
  if (!el) return 0
  // @ts-expect-error - this is a HTMLElement but TS says Node
  if (el.dataset?.rangeOffset != null) return Number(el.dataset?.rangeOffset)
  if (!el.parentElement) return 0
  return getRangeOffset(el.parentElement)
}
