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
        console.log('HOVER IN', blockId)
        send('hover_block', blockId)
      },
      onHoverOut: () => {
        console.log('HOVER OUT', blockId)
        send('hover_block', '')
      },
    }),
    [blockId],
  )
}
