import {FlowContent} from '@app/../../mttast/dist'
import {getPublication} from '@app/client'
import {blockNodeToSlate} from '@app/client/v2/block-to-slate'
import {getEmbedIds} from '@app/editor/embed'
import {queryKeys} from '@app/hooks'
import {useMachine} from '@xstate/react'
import {ForwardedRef, forwardRef, memo} from 'react'
import {useQueryClient} from 'react-query'
import {RenderElementProps, useFocused, useSelected} from 'slate-react'
import {visit} from 'unist-util-visit'
import {assign} from 'xstate'
import {Editor} from '../editor'
import {EditorMode} from '../plugin-utils'
import {embedMachine} from './embed-machine'
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

  let [state] = useMachine(() =>
    embedMachine.withConfig({
      actions: {
        assignError: assign({
          errorMessage: (_, event) => {
            return event.errorMessage
          },
        }),
        assignPublication: assign({
          publication: (_, event) => {
            return event.publication
          },
        }),
        assignBlock: assign({
          block: (_, event) => event.block,
        }),
      },
      services: {
        fetchPublication: () => (sendBack) => {
          client.fetchQuery(
            [queryKeys.GET_PUBLICATION, publicationId],
            async ({queryKey}) => {
              const [, publicationId] = queryKey as [string, string]
              try {
                let publication = await client.fetchQuery(
                  [queryKeys.GET_PUBLICATION, publicationId, version],
                  async ({queryKey}) => {
                    let [, docId, version] = queryKey
                    let pub = await getPublication(docId, version)
                    return pub
                  },
                )
                sendBack({type: 'REPORT.PUBLICATION.SUCCESS', publication})
              } catch (e: any) {
                sendBack({
                  type: 'REPORT.PUBLICATION.ERROR',
                  errorMessage: JSON.stringify(e),
                })
              }
            },
          )
        },
        filterBlock: (context) => (sendBack) => {
          if (context.publication?.document?.children.length) {
            let slateValue = blockNodeToSlate(
              context.publication!.document!.children,
            )

            new Promise((resolve, reject) => {
              visit(
                {type: 'root', children: slateValue.children} as any,
                {id: blockId},
                (node) => {
                  resolve(node as FlowContent)
                },
              )
            })
              .then((block: any) => {
                sendBack({type: 'REPORT.BLOCK.SUCCESS', block})
              })
              .catch((error) => {
                sendBack({
                  type: 'REPORT.BLOCK.ERROR',
                  errorMessage: 'error capturing block',
                })
              })
          }
        },
      },
    }),
  )

  if (state.matches('error')) {
    return (
      <span contentEditable={false} {...props} {...attributes} ref={ref}>
        EMBED ERROR
        {children}
      </span>
    )
  }

  if (state.matches('ready') && state.context.block) {
    return (
      <EmbedUI
        cite={embed}
        {...props}
        {...attributes}
        contentEditable={false}
        ref={ref}
        css={{
          backgroundColor:
            selected && focused ? '$colors$primary-component-bg-hover' : 'none',
        }}
      >
        <Editor
          as="span"
          mode={EditorMode.Embed}
          value={[state.context.block]}
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
