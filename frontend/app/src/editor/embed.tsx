import {mainService as defaultMainService} from '@app/app-providers'
import {useBlockTools} from '@app/editor/block-tools-context'
import {Editor} from '@app/editor/editor'
import {useHover} from '@app/editor/hover-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {embedStyles} from '@app/editor/styles'
import {PublicationWithRef} from '@app/main-machine'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {error} from '@app/utils/logger'
import {getRefFromParams} from '@app/utils/machine-utils'
import {Box} from '@components/box'
import {Embed as EmbedType, FlowContent, isEmbed} from '@mintter/mttast'
import {useMachine} from '@xstate/react'
import {useEffect} from 'react'
import {RenderElementProps} from 'slate-react'
import {visit} from 'unist-util-visit'
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
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isEmbed(element)) {
        if (!element.url) {
          error(
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
  mainService = defaultMainService,
  mode,
}: RenderElementProps & {
  mode: EditorMode
  element: EmbedType
  mainService: typeof defaultMainService
}) {
  let btService = useBlockTools()
  let [docId, version, blockId] = getIdsfromUrl(element.url)
  let [state] = useMachine(() => createEmbedMachine(element.url))
  let hoverService = useHover()

  useEffect(() => {
    if (attributes.ref.current) {
      btService.send({type: 'ENTRY.OBSERVE', entry: attributes.ref.current})
    }
  }, [btService, attributes.ref])

  async function onOpenInNewWindow() {
    if (mode != EditorMode.Discussion) {
      let path = `p/${docId}/${version}/${blockId}`
      mainService.send({type: 'COMMIT.OPEN.WINDOW', path})
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
    <Box
      as="q"
      cite={element.url}
      {...attributes}
      contentEditable={false}
      className={embedStyles({
        highlight: document.body.dataset.hoverBlock == blockId,
      })}
      data-element-type="embed"
      data-block-id={blockId}
      data-parent-block={blockId}
      onMouseEnter={() => {
        console.log('MOUSE ENTER', blockId)

        hoverService.send({type: 'MOUSE_ENTER', blockId})
      }}
      onMouseLeave={() => {
        console.log('MOUSE LEAVE', blockId)
        hoverService.send({type: 'MOUSE_LEAVE', blockId})
      }}
      css={{
        [`[data-hover-block="${blockId}"] &:before`]: {
          backgroundColor: '$primary-component-bg-normal',
          opacity: 1,
        },
      }}
      onClick={onOpenInNewWindow}
    >
      <Editor
        as="span"
        mode={EditorMode.Embed}
        value={state.context.block?.children}
        onChange={() => {
          // noop
        }}
      />
      {children}
    </Box>
  )
}

// type EmbedProps = Omit<RenderElementProps, 'element'> & {
//   element: EmbedType
//   mainService?: typeof defaultMainService
//   mode: EditorMode
// }

// function RenderEmbed(
//   {
//     element,
//     attributes,
//     children,
//     mainService = defaultMainService,
//     mode,
//   }: EmbedProps,
//   ref: ForwardedRef<HTMLQuoteElement>,
// ) {
//   const bookmarksService = useBookmarksService()
//   const [pubId, version, blockId] = getIdsfromUrl(element.url)

//   function addBookmark() {
//     bookmarksService.send({
//       type: 'BOOKMARK.ADD',
//       url: element.url,
//     })
//   }

//   async function onCopy() {
//     await copyTextToClipboard(element.url)
//     toast.success('Embed Reference copied successfully', {
//       position: 'top-center',
//     })
//   }

//   function onGoToPublication() {
//     mainService.send({
//       type: 'GO.TO.PUBLICATION',
//       docId: pubId,
//       version,
//       blockId,
//     })
//   }

//   async function onOpenInNewWindow() {
//     console.log('IS DISCUSSION?', mode == EditorMode.Discussion, mode)

//     if (mode != EditorMode.Discussion) {
//       let path = `p/${pubId}/${version}/${blockId}`
//       mainService.send({type: 'COMMIT.OPEN.WINDOW', path})
//     }
//   }

//   return (
//     <ContextMenu.Root>
//       <ContextMenu.Trigger>
//         <EmbedEditor
//           attributes={attributes}
//           ref={ref}
//           embed={element.url}
//           onClick={onOpenInNewWindow}
//         >
//           {children}
//         </EmbedEditor>
//       </ContextMenu.Trigger>
//       <ContextMenu.Content>
//         <ContextMenu.Item onSelect={onCopy}>
//           <Icon name="Copy" size="1" />
//           <Text size="2">Copy Embed Reference</Text>
//         </ContextMenu.Item>
//         <ContextMenu.Item onSelect={addBookmark}>
//           <Icon name="ArrowChevronDown" size="1" />
//           <Text size="2">Add to Bookmarks</Text>
//         </ContextMenu.Item>
//         <ContextMenu.Item onSelect={onGoToPublication}>
//           <Icon name="ArrowTopRight" size="1" />
//           <Text size="2">Open Embed in main Panel</Text>
//         </ContextMenu.Item>
//         <ContextMenu.Item onSelect={onOpenInNewWindow}>
//           <Icon name="OpenInNewWindow" size="1" />
//           <Text size="2">Open Embed in new Window</Text>
//         </ContextMenu.Item>
//       </ContextMenu.Content>
//     </ContextMenu.Root>
//   )
// }

type EmbedMachineEvent = {
  type: 'REFETCH'
}

type EmbedMachineContext = {
  url: string
  publication?: PublicationWithRef
  block?: FlowContent
  errorMessage: string
}

type EmbedMachineServices = {
  getEmbedPublication: {
    data: PublicationWithRef
  }
  getEmbedBlock: {
    data: FlowContent
  }
}

function createEmbedMachine(
  url: string,
  mainService: typeof defaultMainService = defaultMainService,
) {
  /** @xstate-layout N4IgpgJg5mDOIC5RgLYCNIFoUEMDGAFgJYB2YAdAGZgAuhpUACgK5oA2ReONRA9iQGII-CqQBuvANYUYNAKLpILdp258SiUAAdesIj36aQAD0SYArAGZyANgCMAFgDsAJgAcATks2fHgAzmADQgAJ5mdnZO5Ob2Ng4eHnaWfn6ebgC+6cGoGBDY+MRkVLT0JEysHFwGgmAATrW8teRabNyUjSjksgq5ypVqhkggOnrVRqYImHZ+duRudi52MX4JDi42lkGhiBGzLs5+my6Wlm4O8y6Z2Yp5uKUUlKQQAEJsvHiSQiLk4lIytD1IK93pIjCN9OpxohLB5zOQHJs3G44pYHGtzPtgmEEFE3N4bE41sknJZCV5zFdwDd8vcqE9gR8BHUGk0Wm0Ol0ATcGaChuCxkMJnZ-OQXDFEjMxYs4ljELj8YTjn4SU5zDNMlkQCReBA4EYclg7oUHiVCuUVFVIXzdBDBqAJpgHFZbI5FWcnPNzG5ZZMFrM-LEnV61R4fE5KQbbgVSA96W8PmCbQL7YgXH4HORCQ44o51u5Fj6pi4PNFA363OY1usI9SjTGfhA2GBE6MrSmEPY-OREmiSZWvG5UoWIjY5jYXE5YV4bMGzjXcjTjeRmY1IC3bRpBamTuQ7BWSe5nASvT6Fhn9k5Dql3DO7AT54bo2R18mTGZnFF7M41u7Pd7tpMUqlneuwrE6CyWBq6RAA */
  return createMachine(
    {
      context: {
        url,
        publication: undefined,
        block: undefined,
        errorMessage: '',
      },
      tsTypes: {} as import('./embed.typegen').Typegen0,
      schema: {
        context: {} as EmbedMachineContext,
        services: {} as EmbedMachineServices,
      },
      invoke: {
        src: 'getEmbedBlock',
        id: 'getEmbedBlock',
      },
      id: 'embed-machine',
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
          let mainState = mainService.getSnapshot()
          return new Promise((resolve, reject) => {
            let [docId, version] = getIdsfromUrl(context.url)
            let pub = (
              mainState.context.publicationList as Array<PublicationWithRef>
            ).find<PublicationWithRef>(
              (p: PublicationWithRef) =>
                p.ref.id == getRefFromParams('pub', docId, version),
            )

            if (pub) {
              // let pubState = pub.ref.getSnapshot()
              pub.ref.send('LOAD')
              resolve(pub)
            } else {
              reject('getEmbedPublication Error')
            }
          })
        },
        getEmbedBlock: (context) =>
          new Promise((resolve, reject) => {
            let [, , blockId] = getIdsfromUrl(context.url)
            context.publication?.ref.subscribe((state) => {
              if (state.matches({publication: 'ready'})) {
                console.log('==== HERE', state)
                let temp: FlowContent | undefined

                visit(
                  {
                    type: 'root',
                    children: state.context.publication?.document?.content,
                  },
                  {id: blockId},
                  (node) => {
                    console.log('BLOCK FOUND!', node)
                    temp = node
                  },
                )

                if (temp) {
                  resolve(temp as FlowContent)
                } else {
                  reject(`getEmbedBlock Error`)
                }
              }
            })
          }),
      },
      actions: {
        assignBlock: assign({
          block: (c, event) => {
            console.log('assignBlock', event.data)
            return event.data
          },
        }),
        assignError: assign({
          errorMessage: (_, event) =>
            `${event.type} Error: ${JSON.stringify(event.data)}`,
        }),
        assignPublication: assign({
          publication: (_, event) => event.data,
        }),
        clearError: assign({
          errorMessage: '',
        }),
        clearBlock: assign({
          block: undefined,
        }),
        clearPublication: assign({
          publication: undefined,
        }),
      },
    },
  )
}
