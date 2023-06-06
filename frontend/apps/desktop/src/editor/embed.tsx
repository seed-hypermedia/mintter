import {publicationsClient} from '@app/api-clients'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {
  useHoverVisibleConnection,
  useVisibleConnection,
} from '@app/editor/visible-connection'
import {usePublication} from '@app/models/documents'
import {queryKeys} from '@app/models/query-keys'
import {PublicationRoute, useNavigate, useNavRoute} from '@app/utils/navigation'
import {
  BlockNode,
  blockNodeToSlate,
  Document,
  Embed as EmbedType,
  FlowContent,
  getIdsfromUrl,
  isEmbed,
  Publication,
} from '@mintter/shared'
import {Popover, SizableText, XStack} from '@mintter/ui'
import {QueryClient, useQuery, useQueryClient} from '@tanstack/react-query'
import {useMachine} from '@xstate/react'
import {MouseEvent, useMemo} from 'react'
import {Editor as SlateEditor, Transforms} from 'slate'
import {
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {visit} from 'unist-util-visit'
import {assign, createMachine} from 'xstate'
import type {EditorPlugin} from './types'

export const ELEMENT_EMBED = 'embed'

export function withEmbed(editor: SlateEditor) {
  const {isVoid, isInline} = editor

  editor.isVoid = function embedIsVoid(element) {
    return isEmbed(element) || isVoid(element)
  }

  editor.isInline = function embedIsInline(element) {
    return isEmbed(element) || isInline(element)
  }
  return editor
}

export function embedKeyDown(
  editor: SlateEditor,
  event: React.KeyboardEvent<HTMLElement>,
) {
  if (event.defaultPrevented) return false
  if (editor.selection && event.key == 'Backspace') {
    let match = isEmbedActive(editor)
    if (match) {
      event.preventDefault()
      let [, path] = match

      Transforms.removeNodes(editor, {at: path})
      return true
    }
  }
  return false
}

export function EmbedElement({
  element,
  attributes,
  children,
  mode,
}: RenderElementProps & {mode: EditorMode}) {
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  // const navigateReplace = useNavigate('replace')

  let [docId, version, blockId] = getIdsfromUrl((element as EmbedType).url)
  let {highlight} = useVisibleConnection(blockId)
  let hoverProps = useHoverVisibleConnection(blockId)
  let client = useQueryClient()
  let {data, isSuccess, isError, error} = useEmbed(element as EmbedType)
  console.log('🚀 ~ file: embed.tsx:82 ~ data:', data)
  // let [state] = useMachine(() =>
  //   // @ts-ignore
  //   createEmbedMachine({url: (element as EmbedType).url, client}),
  // )
  // let embedEditor = useMemo(() => buildEditorHook([], EditorMode.Embed), [])

  let selected = useSelected()
  let focused = useFocused()

  function onOpenInNewWindow(event: MouseEvent<HTMLElement>) {
    let isShiftKey = event.shiftKey || event.metaKey
    event.preventDefault()
    if (!docId) return

    const destRoute: PublicationRoute = {
      key: 'publication',
      documentId: docId,
      versionId: version,
      blockId,
    }
    if (isShiftKey) {
      navigate(destRoute)
    } else {
      spawn(destRoute)
    }
  }

  let content = isError
    ? 'EMBED ERROR'
    : isSuccess && typeof data == 'string'
    ? data
    : '...'

  if (isError) {
    console.warn('EMBED ERROR', error)
  }

  return (
    <Popover>
      <SizableText
        tag="q"
        cite={(element as EmbedType).url}
        {...attributes}
        flex={0}
        fontWeight="600"
        color="$mint"
        fontStyle="italic"
        display="inline"
        fontSize="inherit"
        backgroundColor={
          highlight
            ? '$yellow3'
            : focused && selected
            ? '$color4'
            : 'transparent'
        }
        // @ts-ignore
        contentEditable={false}
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: highlight ? '$yellow3' : '$color4',
        }}
        borderRadius="$1"
        onClick={onOpenInNewWindow}
        {...hoverProps}
        onMouseEnter={(event) => {
          console.log('MOUSE ENTER', blockId)

          event.preventDefault()
          event.stopPropagation()
          hoverProps.onHoverIn()
        }}
        style={{userSelect: 'none'}}
        {...attributes}
      >
        {content}
        {children}
      </SizableText>
    </Popover>
  )

  //   if (state.matches('errored')) {
  //     return (
  //       <span contentEditable={false} {...attributes}>
  //         EMBED ERROR
  //         {children}
  //       </span>
  //     )
  //   }

  //   if (state.matches('fetchingPublication') || state.matches('findBlock')) {
  //     return (
  //       <span contentEditable={false} {...attributes}>
  //         ...
  //         {children}
  //       </span>
  //     )
  //   }

  //   return (
  //     <XStack
  //       tag="q"
  //       cite={(element as EmbedType).url}
  //       {...attributes}
  //       flex={0}
  //       display="inline"
  //       backgroundColor={
  //         highlight ? '$yellow3' : focused && selected ? '$color4' : 'transparent'
  //       }
  //       // @ts-ignore
  //       contentEditable={false}
  //       hoverStyle={{
  //         cursor: 'pointer',
  //         backgroundColor: highlight ? '$yellow3' : '$color4',
  //       }}
  //       borderRadius="$1"
  //       onClick={onOpenInNewWindow}
  //       {...hoverProps}
  //       onMouseEnter={(event) => {
  //         console.log('MOUSE ENTER', blockId)

  //         event.preventDefault()
  //         event.stopPropagation()
  //         hoverProps.onHoverIn()
  //       }}
  //     >
  //       <Editor
  //         editor={embedEditor}
  //         mode={EditorMode.Embed}
  //         value={[state.context.block]}
  //         onChange={() => {
  //           // noop
  //         }}
  //       />
  //       {children}
  //     </XStack>
  //   )
}

function useEmbed(element: EmbedType) {
  // get the linked publication
  // filter the block
  // return the string
  let [documentId, versionId, blockId] = getIdsfromUrl(element.url)
  let pubQuery = usePublication({
    documentId,
    versionId,
    enabled: !!documentId && !!versionId,
  })

  return useMemo(() => {
    console.log('embed query data', pubQuery.data)
    if (pubQuery.status != 'success') return pubQuery

    if (pubQuery.data && pubQuery.data.document && blockId) {
      let blockNode = getBlockNodeById(pubQuery.data.document.children, blockId)

      // right now we are just returning the text from the current block, but we should return all the content of it properly
      let data = blockNode && blockNode.block ? blockNode.block.text : undefined

      return {
        ...pubQuery,
        data,
      }
    }
    return {
      ...pubQuery,
      // right now we are just returning the text from the current block, but we should return all the content of it properly
      data: undefined,
    }
  }, [pubQuery.data])
}

function isEmbedActive(editor: SlateEditor) {
  let [match] = SlateEditor.nodes(editor, {
    match: isEmbed,
    mode: 'all',
  })
  return match
}

function getBlockNodeById(
  blocks: Array<BlockNode>,
  blockId: string,
): BlockNode | null {
  let res: BlockNode | undefined
  for (const bn of blocks) {
    if (bn.block?.id == blockId) {
      res = bn
    } else if (bn.children.length) {
      return getBlockNodeById(bn.children, blockId)
    }
  }

  if (!res) {
    return null
  }

  return res
}
