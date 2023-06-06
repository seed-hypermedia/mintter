import {publicationsClient} from '@app/api-clients'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {
  useHoverVisibleConnection,
  useVisibleConnection,
} from '@app/editor/visible-connection'
import {queryKeys} from '@app/models/query-keys'
import {PublicationRoute, useNavigate, useNavRoute} from '@app/utils/navigation'
import {
  blockNodeToSlate,
  Embed as EmbedType,
  FlowContent,
  getIdsfromUrl,
  isEmbed,
  Publication,
} from '@mintter/shared'
import {XStack} from '@mintter/ui'
import {QueryClient, useQueryClient} from '@tanstack/react-query'
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
  let [state] = useMachine(() =>
    // @ts-ignore
    createEmbedMachine({url: (element as EmbedType).url, client}),
  )
  let embedEditor = useMemo(() => buildEditorHook([], EditorMode.Embed), [])
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

  if (state.matches('errored')) {
    return (
      <span contentEditable={false} {...attributes}>
        EMBED ERROR
        {children}
      </span>
    )
  }

  if (state.matches('fetchingPublication') || state.matches('findBlock')) {
    return (
      <span contentEditable={false} {...attributes}>
        ...
        {children}
      </span>
    )
  }

  return (
    <XStack
      tag="q"
      cite={(element as EmbedType).url}
      {...attributes}
      flex={0}
      display="inline"
      backgroundColor={
        highlight ? '$yellow3' : focused && selected ? '$color4' : 'transparent'
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
    >
      <Editor
        editor={embedEditor}
        mode={EditorMode.Embed}
        value={[state.context.block]}
        onChange={() => {
          // noop
        }}
      />
      {children}
    </XStack>
  )
}

type EmbedMachineContext = {
  url: string
  publication?: Publication
  block?: FlowContent
  errorMessage: string
}

type EmbedMachineServices = {
  getEmbedPublication: {
    data: Publication
  }
  getEmbedBlock: {
    data: FlowContent
  }
}

function createEmbedMachine({url, client}: {url: string; client: QueryClient}) {
  /** @xstate-layout N4IgpgJg5mDOIC5RgLYCNIFoUEMDGAFgJYB2YAdAGZgAuhpUACgK5oA2ReONRA9iQGII-CqQBuvANYUYNAKLpILdp258SiUAAdesIj36aQAD0SYArAGZyANgCMAFgDsAJgAcATks2fHgAzmADQgAJ5mdnZO5Ob2Ng4eHnaWfn6ebgC+6cGoGBDY+MRkVLT0JEysHFwGgmAATrW8teRabNyUjSjksgq5ypVqhkggOnrVRqYImHZ+duRudi52MX4JDi42lkGhiBGzLs5+my6Wlm4O8y6Z2Yp5uKUUlKQQAEJsvHiSQiLk4lIytD1IK93pIjCN9OpxohLB5zOQHJs3G44pYHGtzPtgmEEFE3N4bE41sknJZCV5zFdwDd8vcqE9gR8BHUGk0Wm0Ol0ATcGaChuCxkMJnZ-OQXDFEjMxYs4ljELj8YTjn4SU5zDNMlkQCReBA4EYclg7oUHiVCuUVFVIXzdBDBqAJpgHFZbI5FWcnPNzG5ZZMFrM-LEnV61R4fE5KQbbgVSA96W8PmCbQL7YgXH4HORCQ44o51u5Fj6pi4PNFA363OY1usI9SjTGfhA2GBE6MrSmEPY-OREmiSZWvG5UoWIjY5jYXE5YV4bMGzjXcjTjeRmY1IC3bRpBamTuQ7BWSe5nASvT6Fhn9k5Dql3DO7AT54bo2R18mTGZnFF7M41u7Pd7tpMUqlneuwrE6CyWBq6RAA */
  return createMachine(
    {
      id: 'transclusion-machine',
      predictableActionArguments: true,
      tsTypes: {} as import('./embed.typegen').Typegen0,
      schema: {
        context: {} as EmbedMachineContext,
        services: {} as EmbedMachineServices,
      },
      context: {
        url,
        publication: undefined,
        block: undefined,
        errorMessage: '',
      },
      initial: 'fetchingPublication',
      states: {
        fetchingPublication: {
          invoke: {
            src: 'getEmbedPublication',
            id: 'getEmbedPublication',
            onDone: [
              {
                actions: 'assignPublication',
                target: 'findBlock',
              },
            ],
            onError: [
              {
                actions: 'assignError',
                target: 'errored',
              },
            ],
          },
        },
        findBlock: {
          invoke: {
            src: 'getEmbedBlock',
            id: 'getEmbedBlock',
            onDone: [
              {
                actions: 'assignBlock',
                target: 'idle',
              },
            ],
            onError: [
              {
                actions: 'assignError',
                target: 'errored',
              },
            ],
          },
        },
        idle: {},
        errored: {
          on: {
            REFETCH: {
              target: 'fetchingPublication',
              actions: ['clearError', 'clearPublication', 'clearBlock'],
            },
          },
        },
      },
    },
    {
      services: {
        getEmbedPublication: (context) => {
          let [docId, version] = getIdsfromUrl(context.url)
          return client.fetchQuery<Publication>(
            [queryKeys.GET_PUBLICATION, docId, version],
            () =>
              publicationsClient.getPublication({documentId: docId, version}),
          )
        },
        getEmbedBlock: (context) => {
          return new Promise((resolve, reject) => {
            let [, , blockId] = getIdsfromUrl(context.url)
            if (context.publication?.document?.children) {
              let pubContent = blockNodeToSlate(
                context.publication?.document?.children,
                'group',
              )

              const firstChild = pubContent.children[0]
              // if we are embedding the whole document, for now we just display the first block
              if (!blockId && firstChild) {
                resolve(firstChild)
                return
              }

              let temp: FlowContent | undefined

              visit(
                {
                  type: 'root',
                  children: pubContent.children,
                },
                {id: blockId},
                (node) => {
                  temp = node
                },
              )

              if (temp) {
                resolve(temp as FlowContent)
              }
            } else {
              reject(`getEmbedBlock Error: no block was found`)
            }
          })
        },
      },
      actions: {
        assignBlock: assign({
          block: (c, event) => event.data,
        }),
        assignError: assign({
          errorMessage: (_, event) =>
            `${event.type} Error: ${JSON.stringify(event.data)}`,
        }),
        assignPublication: assign({
          publication: (_, event) => event.data,
        }),
        // @ts-ignore
        clearError: assign({
          errorMessage: '',
        }),
        // @ts-ignore
        clearBlock: assign({
          block: undefined,
        }),
        // @ts-ignore
        clearPublication: assign({
          publication: undefined,
        }),
      },
    },
  )
}

function isEmbedActive(editor: SlateEditor) {
  let [match] = SlateEditor.nodes(editor, {
    match: isEmbed,
    mode: 'all',
  })
  return match
}
