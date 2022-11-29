import {getPublication, Publication} from '@app/client'
import {blockNodeToSlate} from '@app/client/v2/block-to-slate'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import {useMain} from '@app/main-context'
import {useMouse} from '@app/mouse-context'
import {Embed as EmbedType, FlowContent, isEmbed} from '@app/mttast'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {QueryClient, useQueryClient} from '@tanstack/react-query'
import {useMachine} from '@xstate/react'
import {MouseEvent, useMemo} from 'react'
import {Editor as SlateEditor, Transforms} from 'slate'
import {RenderElementProps, useFocused, useSelected} from 'slate-react'
import {visit} from 'unist-util-visit'
import {useLocation, useRoute} from 'wouter'
import {assign, createMachine} from 'xstate'
import type {EditorPlugin} from './types'

export const ELEMENT_EMBED = 'embed'

export const createEmbedPlugin = (): EditorPlugin => ({
  name: ELEMENT_EMBED,
  configureEditor(editor) {
    const {isVoid, isInline} = editor

    editor.isVoid = (node) => isEmbed(node) || isVoid(node)
    editor.isInline = (node) => isEmbed(node) || isInline(node)

    return editor
  },
  onKeyDown: (editor) => (event) => {
    if (editor.selection && event.key == 'Backspace') {
      let match = isEmbedActive(editor)
      if (match) {
        event.preventDefault()
        let [, path] = match

        Transforms.removeNodes(editor, {at: path})
      }
    }
  },
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isEmbed(element)) {
        if (!element.url) {
          console.error(
            `Embed: element does not have a url attribute: ${JSON.stringify(
              element,
            )}`,
          )
          return <span {...attributes}>error on embed{children}</span>
        }
        return (
          <Embed
            element={element as EmbedType}
            attributes={attributes}
            mode={editor.mode}
          >
            {children}
          </Embed>
        )
      }
    },
})

function Embed({
  element,
  attributes,
  children,
}: RenderElementProps & {
  mode: EditorMode
}) {
  const mainService = useMain()
  const mouseService = useMouse()
  const [, setLocation] = useLocation()
  let [match, params] = useRoute('/p/:id/:version/:block')
  let [docId, version, blockId] = getIdsfromUrl(element.url)
  let client = useQueryClient()
  let [state] = useMachine(() => createEmbedMachine({url: element.url, client}))
  let editor = useMemo(() => buildEditorHook(plugins, EditorMode.Embed), [])
  let selected = useSelected()
  let focused = useFocused()

  async function onOpenInNewWindow(event: MouseEvent<HTMLElement>) {
    let isShiftKey = event.shiftKey || event.metaKey
    event.preventDefault()
    // if (mode == EditorMode.Embed || mode == EditorMode.Discussion) return

    if (isShiftKey) {
      setLocation(`/p/${docId}/${version}/${blockId}`)
    } else {
      if (match && params?.id == docId && params?.version == version) {
        setLocation(`/p/${docId}/${version}/${blockId}`, {replace: true})
      } else {
        mainService.send({
          type: 'COMMIT.OPEN.WINDOW',
          path: `/p/${docId}/${version}/${blockId}`,
        })
      }
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

  function mouseEnter() {
    mouseService.send({type: 'HIGHLIGHT.ENTER', ref: `${docId}/${blockId}`})
  }
  function mouseLeave() {
    mouseService.send('HIGHLIGHT.LEAVE')
  }

  return (
    <q
      cite={element.url}
      {...attributes}
      className={focused && selected ? 'selected' : undefined}
      contentEditable={false}
      onClick={onOpenInNewWindow}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      data-highlight={`${docId}/${blockId}`}
      data-reference={element.url}
    >
      <Editor
        as="span"
        editor={editor}
        mode={EditorMode.Embed}
        value={state.context.block?.children}
        onChange={() => {
          // noop
        }}
      />
      {children}
    </q>
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
            () => getPublication(docId, version),
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
