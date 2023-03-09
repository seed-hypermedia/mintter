import {useDrag} from '@app/drag-context'
import {useCitationsForBlock} from '@app/editor/comments/citations-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {useMouse} from '@app/mouse-context'
import {Button} from '@components/button'
import {ConversationBlockBubble} from '@components/conversation-block-bubble'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
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
  let {citations = [], onCitationsOpen} = useCitationsForBlock(block.id)
  console.log(
    '🚀 ~ file: drag-section.tsx:65 ~ CitationNumber ~ citations:',
    citations,
  )

  return citations?.length ? (
    <Button
      onClick={(e) => {
        e.preventDefault()
        onCitationsOpen(citations)
      }}
      color="muted"
      variant="ghost"
      size="0"
      contentEditable={false}
      css={{
        userSelect: 'none',
        position: 'absolute',
        top: 32,
        right: -54,
        display: 'flex',
        alignItems: 'center',
        gap: '$2',
        paddingInline: '$3',
        paddingBlock: '$1',
        // borderRadius: '$2',
        zIndex: '$max',
        '&:hover': {
          backgroundColor: '$base-component-bg-hover',
          cursor: 'pointer',
        },
      }}
    >
      <Icon name="ArrowTopRight" size="2" color="muted" />
      <Text
        size="2"
        color="muted"
        css={{
          '&:hover': {
            color: '$base-text-low',
          },
        }}
      >
        {citations.length}
      </Text>
    </Button>
  ) : null
}
