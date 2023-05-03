import {useDrag} from '@app/drag-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {useVisibleConnection} from '@app/editor/visible-connection'
import {send, useListen} from '@app/ipc'
import {useMouse} from '@app/mouse-context'
import {useNavRoute} from '@app/utils/navigation'
import {
  FlowContent,
  isBlockquote,
  isCode,
  isHeading,
  isOrderedList,
} from '@mintter/shared'
import {Circle, SizableText, XStack, YStack} from '@mintter/ui'
import React, {useContext, useMemo, useState} from 'react'
import {RenderElementProps, useSlate} from 'slate-react'
import {DraftBlocktools, PublicationBlocktools} from './blocktools'
import DragContext from './drag-context'
import {useBlockProps} from './editor-node-props'
import {BLOCK_GAP, findPath, useBlockFlash} from './utils'

export type DndState = {fromPath: number[] | null; toPath: number[] | null}

export const ElementDrag = ({children, element, attributes}: RenderElementProps) => {
  let dragService = useDrag()
  let mouseService = useMouse()
  let editor = useSlate()
  let path = findPath(element)
  let route = useNavRoute()
  let {highlight} = useVisibleConnection((element as FlowContent).id)

  const onDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault()
    mouseService.send('DISABLE.DRAG.END')
    dragService?.send({
      type: 'DROPPED',
    })

    e.dataTransfer?.clearData()
  }

  //@ts-ignore
  let {blockProps, blockPath, parentNode} = useBlockProps(element)

  let marker = useMemo(() => {
    if (parentNode?.type == 'orderedList') {
      // add number
      return {
        type: 'number' as const,
        index: blockPath[blockPath.length - 1] + 1,
      }
    } else if (parentNode?.type == 'unorderedList') {
      return {
        type: 'bullet' as const,
        level: blockPath.length,
      }
    }
  }, [blockProps])

  // let inRoute = useBlockFlash(attributes.ref, (element as FlowContent).id)

  const dragContext = useContext(DragContext)
  const {drag, setDrag, clearDrag} = dragContext

  let height = useMemo(() => {
    if (isHeading(element)) {
      return 40
    }
    if (isBlockquote(element)) {
      return 44
    }

    if (isCode(element)) {
      return 64
    }

    return 32
  }, [element.type])

  return (
    <XStack
      {...attributes}
      {...blockProps}
      //@ts-ignore
      onDrop={editor.mode == EditorMode.Draft ? onDrop : undefined}
      onDragEnd={editor.mode == EditorMode.Draft ? onDrop : undefined}
      onDragOver={(e: any) => {
        if (drag) return
        setDrag(e, element as FlowContent)
      }}
      onDragLeave={(e: any) => {
        if (!drag) return
        clearDrag()
      }}
      gap="$2"
      backgroundColor={highlight ? '$yellow3' : 'transparent'}
    >
      <XStack
        //@ts-ignore
        contentEditable={false}
        flex={0}
        flexShrink={0}
        flexGrow={0}
        width={32}
        height={height}
        alignItems="center"
        justifyContent="flex-end"
        // borderColor="green"
        // borderWidth={1}
      >
        {route.key == 'draft' ? (
          <DraftBlocktools current={[element as FlowContent, path]} />
        ) : null}
      </XStack>
      {marker && (
        <Marker
          {...marker}
          start={isOrderedList(parentNode) ? parentNode.start : undefined}
          height={height}
        />
      )}

      <YStack flex={1} gap={BLOCK_GAP}>
        {children}
      </YStack>
      {editor.mode == EditorMode.Publication ? (
        //@ts-ignore
        <XStack
          minHeight={height}
          alignItems="center"
          //@ts-ignore
          contentEditable={false}
          position="absolute"
          right={-40}
          flexShrink={0}
          flexGrow={0}
          width={32}
          height={height}
          justifyContent="flex-start"
          gap="$2"
          // borderColor="red"
          // borderWidth={1}
        >
          <PublicationBlocktools current={[element as FlowContent, path]} />
        </XStack>
      ) : null}
    </XStack>
  )
}

type MarkerProps = {
  type: 'bullet' | 'number'
  level?: number
  index?: number
  start?: number
  height: number
}

function Marker(props: MarkerProps) {
  const index = useMemo(() => {
    let idx = props.index ?? 1
    return props.start ? Number(props.start) + idx - 1 : idx
  }, [props.start, props.index])
  return (
    <XStack
      flex={0}
      flexShrink={0}
      flexGrow={0}
      width={32}
      height={props.height || 32}
      alignItems="center"
      justifyContent="center"
      // borderColor="yellow"
      // borderWidth={1}
      //@ts-ignore
      contentEditable={false}
      userSelect="none"
    >
      {props.type == 'bullet' ? (
        <Circle size={6} backgroundColor="$color" />
      ) : props.type == 'number' ? (
        <SizableText size="$1" color="$color">
          {index}.
        </SizableText>
      ) : null}
    </XStack>
  )
}
