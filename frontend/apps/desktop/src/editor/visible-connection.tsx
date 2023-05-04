import {send, useListen} from '@app/ipc'
import {useMemo, useState} from 'react'

export function useVisibleConnection(blockId?: string) {
  let [highlight, setHighlight] = useState(false)

  useListen<string>('hover_block', (event) => {
    if (!document.hasFocus() && typeof blockId != 'undefined') {
      if (event.payload == blockId) {
        setHighlight(true)
      } else {
        setHighlight(false)
      }
    }
  })

  return {
    highlight,
  }
}

export function useHoverVisibleConnection(blockId?: string) {
  return useMemo(
    () => ({
      onHoverIn: () => {
        send('hover_block', blockId)
      },
      onHoverOut: () => {
        send('hover_block', '')
      },
    }),
    [blockId],
  )
}
