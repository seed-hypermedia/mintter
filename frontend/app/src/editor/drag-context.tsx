import {FlowContent} from '@mintter/shared'
import {createContext} from 'react'

export type HoveredNode = FlowContent | null

export type DragContextValues = {
  drag: HoveredNode
  setDrag: (_e: DragEvent, _node: FlowContent) => void
  clearDrag: () => void
}

const DragContext = createContext<DragContextValues>({
  drag: null,
  setDrag: () => {
    return null
  },
  clearDrag: () => {
    return null
  },
})
export default DragContext
