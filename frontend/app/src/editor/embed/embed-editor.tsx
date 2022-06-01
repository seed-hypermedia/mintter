import {FlowContent} from '@app/../../mttast/dist'
import {blockNodeToSlate} from '@app/client/v2/block-to-slate'
import {getEmbedIds} from '@app/editor/embed'
import {useHover} from '@app/editor/hover-context'
import {usePublication} from '@app/hooks'
import {ForwardedRef, forwardRef, memo, useMemo} from 'react'
import {useQueryClient} from 'react-query'
import {RenderElementProps, useFocused, useSelected} from 'slate-react'
import {visit} from 'unist-util-visit'
import {Editor} from '../editor'
import {EditorMode} from '../plugin-utils'
import {EmbedUI} from './embed-ui'

export type EmbedEditorProps = Pick<
  RenderElementProps,
  'attributes' | 'children'
> & {
  embed: string
  onClick?: any
}

export const EmbedEditor = memo(forwardRef(RenderEmbedEditor))

function RenderEmbedEditor(
  {embed, children, attributes, ...props}: EmbedEditorProps,
  ref: ForwardedRef<HTMLQuoteElement>,
) {
  let client = useQueryClient()
  let [publicationId, version, blockId] = getEmbedIds(embed)
  let selected = useSelected()
  let focused = useFocused()
  let hoverService = useHover()

  // let service = useInterpret(() =>
  //   embedMachine.withConfig({
  //     actions: {
  //       assignError: assign({
  //         errorMessage: (_, event) => {
  //           return event.errorMessage
  //         },
  //       }),
  //       assignPublication: assign({
  //         publication: (_, event) => {
  //           debug('\n================ assignPublication: ', event.publication)
  //           return event.publication
  //         },
  //       }),
  //       assignBlock: assign({
  //         block: (_, event) => event.block,
  //       }),
  //     },
  //     services: {
  //       fetchPublication: () => (sendBack) => {
  //         client.fetchQuery(
  //           [queryKeys.GET_PUBLICATION, publicationId],
  //           async ({queryKey}) => {
  //             const [, publicationId] = queryKey as [string, string]
  //             try {
  //               let publication = await client.fetchQuery(
  //                 [queryKeys.GET_PUBLICATION, publicationId, version],
  //                 async ({queryKey}) => {
  //                   let [, docId, version] = queryKey
  //                   let pub = await getPublication(docId, version)

  //                   return pub
  //                 },
  //               )
  //               debug('\n\n === EMBED PUBLICATION: ', publication)
  //               sendBack({type: 'REPORT.PUBLICATION.SUCCESS', publication})
  //             } catch (e: any) {
  //               sendBack({
  //                 type: 'REPORT.PUBLICATION.ERROR',
  //                 errorMessage: JSON.stringify(e),
  //               })
  //             }
  //           },
  //         )
  //       },
  //       filterBlock: (context) => (sendBack) => {
  //         debug('\n\n === INSIDE FILTER BLOCK INVOKE', context)
  //         if (context.publication?.document?.children.length) {
  //           let slateValue = blockNodeToSlate(
  //             context.publication!.document!.children,
  //           )

  //           new Promise((resolve, reject) => {})
  //             .then((block: any) => {
  //               sendBack({type: 'REPORT.BLOCK.SUCCESS', block})
  //             })
  //             .catch((error) => {
  //               sendBack({
  //                 type: 'REPORT.BLOCK.ERROR',
  //                 errorMessage: 'error capturing block',
  //               })
  //             })
  //         }
  //       },
  //     },
  //   }),
  // )
  // let [state] = useActor(service)

  let state = useEmbed(embed)

  if (state.status == 'error') {
    return (
      <span contentEditable={false} {...props} {...attributes} ref={ref}>
        EMBED ERROR
        {children}
      </span>
    )
  }

  if (state.status == 'success' && state.data.block) {
    return (
      <EmbedUI
        cite={embed}
        {...props}
        {...attributes}
        contentEditable={false}
        onMouseEnter={() => hoverService.send({type: 'MOUSE_ENTER', blockId})}
        ref={ref}
        css={{
          [`[data-hover-block="${blockId}"] &`]: {
            backgroundColor: '$primary-component-bg-hover',
          },
          backgroundColor:
            selected && focused ? '$primary-component-bg-hover' : 'none',
        }}
      >
        <Editor
          as="span"
          mode={EditorMode.Embed}
          value={[state.data.block]}
          onChange={() => {
            // noop
          }}
        />
        {children}
      </EmbedUI>
    )
  }

  return (
    <span {...props} {...attributes} ref={ref} contentEditable={false}>
      ...
      {children}
    </span>
  )
}

export function useEmbed(url: string) {
  if (!url) {
    throw new Error(`useEmbed: "url" must be a valid URL string. got "${url}"`)
  }
  const [publicationId, version, blockId] = getEmbedIds(url)
  const publicationQuery = usePublication(publicationId, version)
  let block = useMemo(() => {
    let temp: FlowContent
    if (publicationQuery.data.document.children?.length) {
      let slateValue = blockNodeToSlate(publicationQuery.data.document.children)

      visit(
        {type: 'root', children: slateValue.children} as any,
        {id: blockId},
        (node) => {
          temp = node
        },
      )
    }

    //@ts-ignore
    return temp
  }, [publicationQuery, blockId])

  return {
    ...publicationQuery,
    data: {
      ...publicationQuery.data,
      block,
    },
  }
}
