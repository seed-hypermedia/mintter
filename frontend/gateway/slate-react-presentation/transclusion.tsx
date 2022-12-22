import {QueryClient, useQueryClient} from '@tanstack/react-query'
import {useMachine} from '@xstate/react'
import Link from 'next/link'
import {visit} from 'unist-util-visit'
import {assign, createMachine} from 'xstate'
import {SlateReactPresentation} from '.'
import {getPublication, Publication} from '../client'
import {blockNodeToSlate} from '../client/v2/block-to-slate'
import {Embed, FlowContent} from '../mttast'
import {getIdsfromUrl} from '../utils/get-ids-from-url'
import {useRenderElement} from './render-element'
import {useRenderLeaf} from './render-leaf'

export function Transclusion({element}: {element: Embed}) {
  let renderElement = useRenderElement()
  let renderLeaf = useRenderLeaf()
  let client = useQueryClient()
  let [state] = useMachine(() =>
    createTransclusionMachine({url: element.url, client}),
  )

  if (state.matches('idle') && state.context.block) {
    return (
      <Link
        href={`/p/${state.context.publication?.document.id}/${state.context.publication?.version}/${state.context.blockId}`}
      >
        <q>
          <SlateReactPresentation
            type="transclusion"
            value={state.context.block.children}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
          />
        </q>
      </Link>
    )
  }
  return null
}

export function createTransclusionMachine({
  url,
  client,
}: {
  url: string
  client: QueryClient
}) {
  return createMachine(
    {
      id: 'transclusion-machine',
      predictableActionArguments: true,
      tsTypes: {} as import('./transclusion.typegen').Typegen0,
      schema: {
        context: {} as TransclusionMachineContext,
        services: {} as TransclusionMachineServices,
      },
      context: {
        url,
        publication: undefined,
        block: undefined,
        errorMessage: '',
      },
      entry: ['setLink'],
      initial: 'fetchingPublication',
      states: {
        gettingParams: {
          entry: ['assignParams'],
          always: 'fetchingPublication',
        },
        fetchingPublication: {
          invoke: {
            src: 'getPublication',
            id: 'getPublication',
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
            src: 'getBlock',
            id: 'getBlock',
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
        getPublication: (context) => {
          let [docId, version] = getIdsfromUrl(context.url)
          return client.fetchQuery<Publication>(
            ['PUBLICATION', docId, version],
            () => getPublication(docId, version),
          )
        },
        getBlock: (context) => {
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
              reject(`getBlock Error: no block was found`)
            }
          })
        },
      },
      actions: {
        assignParams: assign((context) => {
          let [docId, version, blockId] = getIdsfromUrl(context.url)
          return {
            docId,
            version,
            blockId,
          }
        }),
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
        // setLink: assign({
        //   webLink: (context) => {
        //     console.log('LINK', context.url)
        //   },
        // }),
      },
    },
  )
}

type TransclusionMachineContext = {
  url: string
  docId?: string
  version?: string
  blockId?: string
  publication?: Publication
  block?: FlowContent
  errorMessage: string
  webLink: string
}

type TransclusionMachineServices = {
  getPublication: {
    data: Publication
  }
  getBlock: {
    data: FlowContent
  }
}
