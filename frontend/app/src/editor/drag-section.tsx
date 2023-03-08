import {useDrag} from '@app/drag-context'
import {useCitationsForBlock} from '@app/editor/comments/citations-context'
import {useConversations} from '@app/editor/comments/conversations-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {useMouse} from '@app/mouse-context'
import {ConversationBlockBubble} from '@components/conversation-block-bubble'
import {FlowContent} from '@mintter/shared'
import React from 'react'
import {RenderElementProps, useSlate} from 'slate-react'
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
  let editor = useSlate()

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
      onDrop={editor.mode == EditorMode.Draft ? onDrop : undefined}
      onDragEnd={editor.mode == EditorMode.Draft ? onDrop : undefined}
    >
      <BlockTools block={element as FlowContent} />
      {children}
      {editor.mode == EditorMode.Publication ? (
        <span contentEditable={false}>
          <ConversationBlockBubble block={element as FlowContent} />
          {editor.mode == EditorMode.Publication ? (
            <CitationNumber block={element as FlowContent} />
          ) : null}
        </span>
      ) : null}
    </li>
  )
}

function CitationNumber({block}: {block: FlowContent}) {
  let cites = useCitationsForBlock(block.id)
  console.log('🚀 ~ file: drag-section.tsx:62 ~ CitationNumber ~ cites:', cites)

  return cites ? <span>{cites.length}</span> : null
}
