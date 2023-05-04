import {useDrag} from '@app/drag-context'
import { createDragMachine, DragEntry, LineType } from '@app/drag-machine'
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
import { useActor, useSelector } from '@xstate/react'
import React, {useContext, useMemo, useState} from 'react'
import { Path } from 'slate'
import {RenderElementProps, useSlate} from 'slate-react'
import {DraftBlocktools, PublicationBlocktools} from './blocktools'
import DragContext from './drag-context'
import {useBlockProps} from './editor-node-props'
import {BLOCK_GAP, findPath, useBlockFlash} from './utils'

export type DndState = {fromPath: number[] | null; toPath: number[] | null}

export const ElementDrag = (props: RenderElementProps) => {
  let editor = useSlate()
  
  if (editor.mode === EditorMode.Draft) {
    return <DraftSection {...props} />
  } else {
    return <PublicationSection {...props} />
  }
}

const DraftSection = ({children, element, attributes}: RenderElementProps) => {
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
  const dragOverRef = useSelector(dragService!, (state) => {
    return state.context.dragOverRef
  })
  const nestedGroup = useSelector(dragService!, (state) => {
    return state.context.nestedGroup
  })
  const lineType: LineType | null = useMemo(() => {
    if (dragOverRef) {
      let i = 0;
      if (nestedGroup && nestedGroup.some((el, index) => {i = index; return Path.equals(el.entry[1], path)})) {
        return nestedGroup[i].line
      }
      if (Path.equals(dragOverRef.entry[1], path))
        return dragOverRef.line
    }
    return null
  }, [dragOverRef, nestedGroup])

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
      <XStack
        height={3}
        width="100%"
        position="absolute"
        bottom={lineType !== LineType.TOP ? -3 : undefined}
        top={lineType === LineType.TOP ? -3 : undefined}
        left={0}
        // backgroundColor="$background"
        opacity={lineType != null ? 1 : 0}
        zIndex={1000 + path.length}
        gap="$2"
      >
        <XStack
          height={3}
          width={32}
          left={lineType === LineType.GROUP || lineType === LineType.NESTED ? 36 : 0}
          backgroundColor={lineType === LineType.NESTED ? "$green7" : "$blue8"}
          opacity={lineType === LineType.GROUP || lineType === LineType.NESTED ? 1 : 0}
        />
        <XStack
          flex={1}
          left={lineType === LineType.GROUP || lineType === LineType.NESTED ? 75 : 0}
          backgroundColor="$blue8"
        />
      </XStack>
    </XStack>
  )
}

const PublicationSection = ({children, element, attributes}: RenderElementProps) => {
  let path = findPath(element)
  let {highlight} = useVisibleConnection((element as FlowContent).id)

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
      >
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
