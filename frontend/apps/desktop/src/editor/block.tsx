import {DraftBlocktools, PublicationBlocktools} from '@app/editor/blocktools'
import {EditorMode} from '@app/editor/plugin-utils'
import {useVisibleConnection} from '@app/editor/visible-connection'
import {useNavRoute} from '@app/utils/navigation'
import {
  FlowContent,
  GroupingContent,
  isBlockquote,
  isCode,
  isGroupContent,
  isHeading,
  isOrderedList,
} from '@mintter/shared'
import {Circle, SizableText, XStack, YStack} from '@mintter/ui'
import {useMemo, useState} from 'react'
import {Editor} from 'slate'
import {RenderElementProps, useSlateStatic} from 'slate-react'
import {BLOCK_GAP, findPath, useMode} from './utils'

export type DndState = {fromPath: number[] | null; toPath: number[] | null}

export function BlockElement({
  attributes,
  children,
  element,
}: RenderElementProps) {
  return (
    <Block element={element} attributes={attributes}>
      {children}
    </Block>
  )
  // return children
}

export const Block = (props: RenderElementProps) => {
  let mode = useMode()
  if (mode == EditorMode.Draft) {
    return <DraftSection {...props} />
  }
  if (mode == EditorMode.Publication) {
    return <PublicationSection {...props} />
  }

  return props.children
}

const DraftSection = ({children, element, attributes}: RenderElementProps) => {
  let editor = useSlateStatic()
  let route = useNavRoute()
  let [hover, setHover] = useState(false)
  let [dropdownOpen, setDropDownOpen] = useState(false)
  // let {highlight} = useVisibleConnection((element as FlowContent).id)

  // let {blockProps, blockPath, parentNode} = useBlockProps(editor, element)
  let path = findPath(element)
  let parentNode = useMemo(() => {
    let parentEntry = Editor.above<GroupingContent>(editor, {
      match: isGroupContent,
      mode: 'lowest',
      at: path,
    })
    if (!parentEntry) return null
    return parentEntry[0]
  }, [path])

  let marker = useMemo(() => {
    if (parentNode?.type == 'orderedList') {
      // add number
      return {
        type: 'number' as const,
        index: path[path.length - 1] + 1,
      }
    } else if (parentNode?.type == 'unorderedList') {
      return {
        type: 'bullet' as const,
        level: path.length,
      }
    }
  }, [element])

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
      gap="$2"
      // backgroundColor={
      //   route.key != 'draft' && highlight ? '$yellow3' : 'transparent'
      // }
      position={!dropdownOpen ? 'relative' : undefined}
    >
      <XStack
        contentEditable={false}
        position="absolute"
        top={0}
        left="-50%"
        width="200%"
        height="100%"
        onPointerEnter={!dropdownOpen ? () => setHover(true) : undefined}
        onPointerLeave={() => (!dropdownOpen ? setHover(false) : undefined)}
      />
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
        onPointerEnter={!dropdownOpen ? () => setHover(true) : undefined}
        onPointerLeave={() => (!dropdownOpen ? setHover(false) : undefined)}
      >
        {hover ? (
          <DraftBlocktools
            editor={editor}
            current={[element as FlowContent, path]}
            onOpenChange={(isOpen) => {
              setDropDownOpen(isOpen)
              if (!isOpen) setHover(false)
            }}
            open={dropdownOpen}
          />
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
    </XStack>
  )
}

const PublicationSection = ({
  children,
  element,
  attributes,
}: RenderElementProps) => {
  const editor = useSlateStatic()
  let {highlight} = useVisibleConnection((element as FlowContent).id)
  let [hover, setHover] = useState(false)
  //@ts-ignore
  // let {blockProps, blockPath, parentNode} = useBlockProps(element)

  let path = findPath(element)

  let parentNode = useMemo(() => {
    let parentEntry = editor.above<GroupingContent>({
      match: isGroupContent,
      mode: 'lowest',
      at: path,
    })
    if (!parentEntry) return null
    return parentEntry[0]
  }, [path])

  let marker = useMemo(() => {
    if (parentNode?.type == 'orderedList') {
      // add number
      return {
        type: 'number' as const,
        index: path[path.length - 1] + 1,
      }
    } else if (parentNode?.type == 'unorderedList') {
      return {
        type: 'bullet' as const,
        level: path.length,
      }
    }
  }, [element])

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
      gap="$2"
      backgroundColor={highlight ? '$yellow3' : 'transparent'}
      position="relative"
    >
      <XStack
        position="absolute"
        top={0}
        left="-50%"
        width="200%"
        height="100%"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      />
      <XStack
        //@ts-ignore
        contentEditable={false}
        flex={0}
        flexShrink={0}
        flexGrow={0}
        width={32}
        height={height}
        alignItems="center"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        justifyContent="flex-end"
      ></XStack>
      {marker && (
        <Marker
          {...marker}
          start={isOrderedList(parentNode) ? parentNode.start : undefined}
          height={height}
        />
      )}
      <YStack
        flex={1}
        gap={BLOCK_GAP}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
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
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        // borderColor="red"
        // borderWidth={1}
      >
        {hover ? (
          <PublicationBlocktools current={[element as FlowContent, path]} />
        ) : null}
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
