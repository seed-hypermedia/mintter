import {useDrag} from '@app/drag-context'
import {useMouse} from '@app/mouse-context'
import {ConversationBlockBubble} from '@components/conversation-block-bubble'
import {FlowContent} from '@mintter/shared'
import React from 'react'
import {RenderElementProps} from 'slate-react'
import {BlockTools} from './blocktools'
import {useBlockProps} from './editor-node-props'
import {useBlockFlash} from './utils'

export type DndState = {fromPath: number[] | null; toPath: number[] | null}

export const ElementDrag = ({
  children,
  element,
  attributes,
}: RenderElementProps) => {
  let dragService = useDrag()
  let mouseService = useMouse()

  const onDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault()
    mouseService.send('DISABLE.DRAG.END')
    dragService?.send({
      type: 'DROPPED',
    })

    e.dataTransfer?.clearData()
  }

  let {blockProps} = useBlockProps(element)

  let inRoute = useBlockFlash(attributes.ref, element.id)

  return (
    <li
      {...attributes}
      {...blockProps}
      className={inRoute ? 'flash' : undefined}
      onDrop={onDrop}
      onDragEnd={onDrop}
    >
      <BlockTools block={element as FlowContent} />
      {children}
      <span contentEditable={false}>
        <ConversationBlockBubble block={element as FlowContent} />
      </span>
    </li>
  )
}
