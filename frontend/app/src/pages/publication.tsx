import {createDraft, getInfo, getPublication, Link, listCitations, Publication as PublicationType} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {useCitationService} from '@app/editor/citations'
import {ContextMenu} from '@app/editor/context-menu'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {EditorDocument} from '@app/editor/use-editor-draft'
import {queryKeys, useAccount} from '@app/hooks'
import {tippingMachine, tippingModel} from '@app/tipping-machine'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getBlock} from '@app/utils/get-block'
import {getDateFormat} from '@app/utils/get-format-date'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {useSidepanel} from '@components/sidepanel'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {document, FlowContent, group} from '@mintter/mttast'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {useActor, useInterpret, useMachine} from '@xstate/react'
import {useEffect} from 'react'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import {QueryClient, useQueryClient} from 'react-query'
import {useLocation} from 'wouter'
import {StateFrom} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {PublicationPageProps} from './types'

export default function Publication({params}: PublicationPageProps) {
  const client = useQueryClient()
  //@ts-ignore
  const [, setLocation] = useLocation()
  const citations = useCitationService()

  const [state, send] = usePagePublication(client, params?.docId)

  const {data: author} = useAccount(state.context.publication?.document?.author, {
    enabled: !!state.context.publication?.document?.author,
  })

  useEffect(() => {
    if (params?.docId) {
      send(publicationModel.events[PUBLICATION_FETCH_DATA](params.docId, params.version))
      citations.send({type: 'CITATIONS.FETCH', documentId: params.docId, version: params.version})
    }
  }, [params?.docId])

  // useEffect(() => {
  //   if (data.document.title) {
  //     getCurrentWindow().setTitle(data.document.title)
  //   }
  // }, [data.document.title])

  async function handleUpdate() {
    try {
      const d = await createDraft(params?.docId)
      if (d?.id) {
        setLocation(`/editor/${d.id}`)
      }
    } catch (err) {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, err)
    }
  }

  if (state.matches('fetching')) {
    return <Text>loading...</Text>
  }

  // start rendering
  if (state.matches('errored')) {
    return (
      <Box
        css={{
          padding: '$5',
        }}
      >
        <Text>Publication ERROR</Text>
        <Text>{state.context.errorMessage}</Text>
        <Button onClick={() => send(publicationModel.events[PUBLICATION_FETCH_DATA](state.context.id))} color="muted">
          try again
        </Button>
      </Box>
    )
  }

  return (
    <>
      <Box
        css={{
          background: '$background-alt',
          borderBottom: '1px solid $colors$block-hover',
          position: 'sticky',
          top: 0,
          zIndex: '$3',
          padding: '$5',
          '@bp2': {
            paddingLeft: 80,
          },
          $$gap: '16px',
          display: 'flex',
          gap: '$$gap',
          alignItems: 'center',
          '& *': {
            position: 'relative',
          },
          '& > *:not(:first-child):before': {
            content: `"|"`,
            color: '$text-muted',
            opacity: 0.5,
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
          },
        }}
      >
        <Text size="1" color="muted" css={{paddingRight: '$3'}}>
          {state.context.publication?.document.title}
        </Text>
        {author && (
          <>
            <Text size="1" color="muted" css={{paddingRight: '$3'}}>
              <span>Signed by </span>
              <span style={{textDecoration: 'underline'}}>
                {state.context.canUpdate ? 'you' : author.profile?.alias}
              </span>
            </Text>
          </>
        )}
        {state.context.canUpdate && (
          <Button size="1" variant="ghost" onClick={handleUpdate} disabled={state.hasTag('pending')}>
            Update
          </Button>
        )}
        <Button
          size="1"
          variant={state.matches('discussion') ? 'solid' : 'ghost'}
          onClick={() => send(publicationModel.events[PUBLICATION_TOGGLE_DISCUSSION]())}
          disabled={state.hasTag('pending')}
        >
          Toggle Discussion
        </Button>
        <TippingModal
          publicationId={state.context.publication?.document.id}
          accountId={state.context.publication?.document.author}
          visible={!state.context.canUpdate}
        />
      </Box>
      {state.matches('ready') && (
        <Box
          data-testid="publication-wrapper"
          css={{
            padding: '$5',
            paddingTop: '$8',
            marginHorizontal: '$4',
            paddingBottom: 300,
            height: '100%',
            '@bp2': {
              marginHorizontal: '$9',
            },
          }}
        >
          <Box css={{width: '$full', maxWidth: '64ch', marginLeft: '-$7'}}>
            <Editor
              mode={EditorMode.Publication}
              value={state.context.publication?.document.content}
              onChange={() => {
                // noop
              }}
            />
          </Box>
        </Box>
      )}
      {state.matches('discussion') && (
        <Box
          data-testid="publication-wrapper"
          css={{
            padding: '$5',
            paddingTop: '$8',
            marginHorizontal: '$4',
            paddingBottom: 300,
            height: '100%',
            '@bp2': {
              marginHorizontal: '$9',
            },
          }}
        >
          <Box css={{width: '$full', maxWidth: '64ch'}}>
            {state.matches('discussion.ready') && state.context.links?.length != 0 ? (
              // <Editor mode={EditorMode.Discussion} value={state.context.discussion.children as Array<MttastContent>} />
              <Discussion links={state.context.links} />
            ) : (
              <>
                <Text>There is no Discussion yet.</Text>
                <Button size="1">Start one</Button>
              </>
            )}
          </Box>
        </Box>
      )}
      <Box
        css={{
          background: '$background-alt',
          width: '$full',
          position: 'absolute',
          bottom: 0,
          zIndex: '$3',
          padding: '$5',

          '@bp2': {
            paddingLeft: 80,
          },
          '&:after': {
            content: '',
            position: 'absolute',
            width: '$full',
            height: 20,
            background: 'linear-gradient(0deg, $colors$background-alt 0%, rgba(255,255,255,0) 100%)',
            top: -20,
            left: 0,
          },
          $$gap: '24px',
          display: 'flex',
          gap: '$$gap',
          alignItems: 'center',
          '& > span': {
            position: 'relative',
          },
          '& *:not(:first-child):before': {
            content: `"|"`,
            color: '$text-muted',
            position: 'absolute',
            left: -14,
            top: 0,
          },
        }}
      >
        <Text size="1" color="muted">
          Created on: {getDateFormat(state.context.publication?.document, 'createTime')}
        </Text>
        <Text size="1" color="muted">
          Last modified: {getDateFormat(state.context.publication?.document, 'updateTime')}
        </Text>
      </Box>
    </>
  )
}

function usePagePublication(client: QueryClient, docId?: string) {
  const service = useInterpret(() => createPublicationMachine(client))
  const [state, send] = useActor(service)

  useEffect(() => {
    if (docId) {
      send(publicationModel.events[PUBLICATION_FETCH_DATA](docId))
    }
  }, [send, docId])

  return [state, send] as const
}

export type ClientPublication = Omit<PublicationType, 'document'> & {document: EditorDocument}

export const PUBLICATION_FETCH_DATA = 'PUBLICATION.FETCH.DATA'
export const PUBLICATION_REPORT_SUCCESS = 'PUBLICATION.REPORT.SUCCESS'
export const PUBLICATION_REPORT_ERROR = 'PUBLICATION.REPORT.ERROR'
export const PUBLICATION_TOGGLE_DISCUSSION = 'TOGGLE.DISCUSSION'
const publicationModel = createModel(
  {
    id: '',
    version: '',
    publication: null as ClientPublication | null,
    errorMessage: '',
    canUpdate: false,
    links: undefined as Array<Link> | undefined,
    discussion: null as any,
  },
  {
    events: {
      [PUBLICATION_REPORT_SUCCESS]: (props: {publication: ClientPublication; canUpdate: boolean}) => props,
      [PUBLICATION_REPORT_ERROR]: (errorMessage: string) => ({errorMessage}),
      [PUBLICATION_FETCH_DATA]: (id: string, version?: string) => ({id, version}),
      [PUBLICATION_TOGGLE_DISCUSSION]: () => ({}),
      'REPORT.DISCUSSION.SUCCESS': (links: Array<Link>, discussion: any) => ({links, discussion}),
      'REPORT.DISCUSSION.ERROR': (errorMessage: string) => ({errorMessage}),
    },
  },
)

function createPublicationMachine(client: QueryClient) {
  return publicationModel.createMachine({
    tsTypes: {} as import('./publication.typegen').Typegen0,
    id: 'publication-machine',
    context: publicationModel.initialContext,
    initial: 'idle',
    states: {
      idle: {
        on: {
          [PUBLICATION_FETCH_DATA]: {
            target: 'fetching',
            actions: [
              publicationModel.assign({
                id: (_, event) => event.id,
                version: (_, event) => event.version ?? '',
              }),
            ],
          },
        },
      },
      fetching: {
        tags: ['pending'],
        invoke: {
          src: (ctx) => (sendBack) => {
            Promise.all([
              client.fetchQuery([queryKeys.GET_PUBLICATION, ctx.id, ctx.version], () =>
                getPublication(ctx.id, ctx.version),
              ),
              client.fetchQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo()),
            ])
              .then(([publication, info]) => {
                if (publication.document?.content) {
                  let content = JSON.parse(publication.document?.content)
                  sendBack(
                    publicationModel.events[PUBLICATION_REPORT_SUCCESS]({
                      publication: Object.assign(publication, {document: {...publication.document, content}}),
                      canUpdate: info.accountId == publication.document.author,
                    }),
                  )
                } else {
                  if (publication.document?.content === '') {
                    sendBack(publicationModel.events[PUBLICATION_REPORT_ERROR]('Content is Empty'))
                  } else {
                    sendBack(publicationModel.events[PUBLICATION_REPORT_ERROR]('error parsing content'))
                  }
                }
              })
              .catch((err) => {
                sendBack(publicationModel.events[PUBLICATION_REPORT_ERROR]('error fetching'))
              })
          },
        },
        on: {
          [PUBLICATION_REPORT_SUCCESS]: {
            target: 'ready',
            actions: [
              publicationModel.assign((_, ev) => ({
                publication: ev.publication,
                canUpdate: ev.canUpdate,
                errorMessage: '',
              })),
            ],
          },
          [PUBLICATION_REPORT_ERROR]: {
            target: 'errored',
            actions: publicationModel.assign({
              errorMessage: (_, ev) => ev.errorMessage,
            }),
          },
        },
      },
      ready: {
        on: {
          [PUBLICATION_FETCH_DATA]: {
            target: 'fetching',
            actions: [
              publicationModel.assign({
                id: (_, event) => event.id,
                errorMessage: '',
              }),
            ],
          },
          [PUBLICATION_TOGGLE_DISCUSSION]: {
            target: 'discussion',
          },
        },
      },
      discussion: {
        initial: 'idle',
        onDone: [
          {
            target: 'errored',
            cond: (context) => !!context.errorMessage,
          },
          {
            target: 'ready',
          },
        ],
        states: {
          idle: {
            always: [
              {
                target: 'ready',
                cond: (context) => typeof context.links != 'undefined',
              },
              {
                target: 'fetching',
              },
            ],
          },
          fetching: {
            tags: ['pending'],
            invoke: {
              src: (context) => (sendBack) => {
                listCitations(context.id)
                  .then((response) => {
                    Promise.all(response.links.map(({source}) => getBlock(source)))
                      //@ts-ignore
                      .then((result: Array<FlowContent>) => {
                        let discussion = document([group(result)])
                        sendBack(publicationModel.events['REPORT.DISCUSSION.SUCCESS'](response.links, discussion))
                      })
                  })
                  .catch((error) => {
                    sendBack(publicationModel.events['REPORT.DISCUSSION.ERROR'](error))
                  })
              },
            },
            on: {
              'REPORT.DISCUSSION.SUCCESS': {
                target: 'ready',
                actions: [
                  publicationModel.assign((_, event) => ({
                    links: event.links,
                    discussion: event.discussion,
                    errorMessage: '',
                  })),
                ],
              },
              'REPORT.DISCUSSION.ERROR': {
                target: 'finish',
                actions: [
                  publicationModel.assign({
                    errorMessage: (_, event) => JSON.stringify(event.errorMessage),
                  }),
                ],
              },
            },
          },
          ready: {
            on: {
              [PUBLICATION_TOGGLE_DISCUSSION]: {
                target: 'finish',
              },
              [PUBLICATION_FETCH_DATA]: {
                target: 'finish',
                actions: [
                  publicationModel.assign({
                    links: undefined,
                  }),
                ],
              },
            },
          },
          finish: {
            type: 'final',
          },
        },
      },
      errored: {
        on: {
          [PUBLICATION_FETCH_DATA]: {
            target: 'fetching',
            actions: [
              publicationModel.assign({
                id: (_, event) => event.id,
              }),
            ],
          },
        },
      },
    },
  })
}

function TippingModal({
  visible = false,
  publicationId,
  accountId,
}: {
  visible: boolean
  publicationId?: string
  accountId?: string
}) {
  // if (!visible) return null

  const service = useInterpret(tippingMachine)
  const [state, send] = useActor(service)

  useEffect(() => {
    if (publicationId && accountId) {
      send(tippingModel.events.SET_TIP_DATA(publicationId, accountId))
    }
  }, [publicationId, accountId])

  if (typeof publicationId == 'undefined' || typeof accountId == 'undefined') {
    // console.error(`Tipping Modal ERROR: invalid publicationId or accountId: ${{publicationId, accountId}}`)

    return null
  }

  return (
    <PopoverPrimitive.Root
      open={state.matches('open')}
      onOpenChange={(newVal) => {
        if (newVal) {
          send(tippingModel.events.OPEN())
        } else {
          send(tippingModel.events.CLOSE())
        }
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <Button
          size="1"
          variant="ghost"
          color="success"
          onClick={() => {
            send(tippingModel.events.OPEN())
          }}
        >
          Tip Author
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content>
        {state.matches('open.setAmount') && <SetAmount state={state} send={send} />}
        {state.matches('open.requestInvoice') ||
          (state.matches('open.paying') && (
            <Box
              css={{
                padding: '$5',
                width: '300px',
                backgroundColor: '$background-muted',
                display: 'flex',
                flexDirection: 'column',
                gap: '$4',
                boxShadow: '$3',
              }}
            >
              <Text>...</Text>
            </Box>
          ))}
        {state.matches('open.errored') && (
          <Box
            css={{
              padding: '$5',
              width: '300px',
              backgroundColor: '$background-muted',
              display: 'flex',
              flexDirection: 'column',
              gap: '$4',
              boxShadow: '$3',
            }}
          >
            <Text>Error:</Text>
            <Text size="1" color="danger">
              {JSON.stringify(state.context.errorMessage)}
            </Text>
            <Button size="1" type="submit" css={{width: '$full'}} onClick={() => send(tippingModel.events.RETRY())}>
              Retry
            </Button>
          </Box>
        )}
        {state.matches('open.readyToPay') && (
          <Box
            css={{
              padding: '$5',
              width: '300px',
              backgroundColor: '$background-muted',
              display: 'flex',
              flexDirection: 'column',
              gap: '$4',
              boxShadow: '$3',
              svg: {
                width: '100%',
              },
            }}
          >
            <QRCode title="demo demo" value={state.context.invoice} size={300 - 32} />
            <Box>
              <Text size="1" fontWeight="bold">
                Invoice:
              </Text>
              <Text size="1" css={{wordBreak: 'break-all', wordWrap: 'break-word'}}>
                {state.context.invoice}
              </Text>
            </Box>
            <Button size="1" css={{width: '$full'}} onClick={() => send(tippingModel.events.PAY_INVOICE())}>
              Pay Directly
            </Button>
          </Box>
        )}
        {state.matches('open.success') && (
          <Box
            css={{
              padding: '$5',
              width: '300px',
              backgroundColor: '$background-muted',
              display: 'flex',
              flexDirection: 'column',
              gap: '$4',
              boxShadow: '$3',
            }}
          >
            <Icon name="Star" />
            <Text>Payment Success!</Text>
          </Box>
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}

function SetAmount({send, state}: {state: StateFrom<typeof tippingMachine>; send: any}) {
  return (
    <Box
      css={{
        padding: '$5',
        width: '300px',
        backgroundColor: '$background-muted',
        display: 'flex',
        flexDirection: 'column',
        gap: '$4',
        boxShadow: '$3',
      }}
    >
      <Text size="4">Tip this Author</Text>
      {
        <Box css={{display: 'flex', flexDirection: 'column', gap: '$3'}}>
          <TextField
            type="number"
            id="amount"
            name="amount"
            label="Invoice Amount"
            size={1}
            value={state.context.amount}
            onChange={(e) => send(tippingModel.events.UPDATE_AMOUNT(Number(e.target.value)))}
          />
          <Box
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Button
              size="1"
              type="submit"
              disabled={state.hasTag('pending')}
              css={{width: '$full'}}
              onClick={() => send(tippingModel.events.REQUEST_INVOICE())}
            >
              Request Invoice
            </Button>
          </Box>
        </Box>
      }
    </Box>
  )
}

function Discussion({links = []}: {links?: Array<Link>}) {
  if (!links.length) return null

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$4',
      }}
    >
      {links.map((link) => (
        <DiscussionItem key={`${link.source?.documentId}-${link.target?.documentId}`} link={link} />
      ))}
    </Box>
  )
}

function DiscussionItem({link}: {link: Link}) {
  const [state, send] = useMachine(() => discussionItemMachine)
  const {data: author} = useAccount(state?.context?.publication?.document?.author)
  const bookmarkService = useBookmarksService()
  const sidepanelService = useSidepanel()
  const [, setLocation] = useLocation()

  function addBookmark() {
    bookmarkService.send({
      type: 'BOOKMARK.ADD',
      url: `${MINTTER_LINK_PREFIX}${link.source?.documentId}/${link.source?.version}/${link.source?.blockId}`,
    })
  }

  async function onCopy() {
    await copyTextToClipboard(
      `${MINTTER_LINK_PREFIX}${link.source?.documentId}/${link.source?.version}/${link.source?.blockId}`,
    )
    toast.success('Embed Reference copied successfully', {position: 'top-center'})
  }

  function onGoToPublication() {
    setLocation(`/p/${link.source?.documentId}/${link.source?.version}`)
  }

  useEffect(() => {
    send(discussionItemModel.events.FETCH(link))
  }, [])

  if (state.hasTag('pending')) {
    return <span>loading...</span>
  }

  const {block, publication} = state.context

  if (state.matches('ready')) {
    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box
            css={{
              borderBottom: '1px solid rgba(0,0,0,0.1)',
              '&:hover': {
                cursor: 'pointer',
              },
            }}
          >
            {block ? <Editor mode={EditorMode.Embed} value={[block]} /> : null}
            <Box
              css={{
                paddingVertical: '$6',
                $$gap: '16px',
                display: 'flex',
                gap: '$$gap',
                alignItems: 'center',
                '& *': {
                  position: 'relative',
                },
                '& *:not(:first-child):before': {
                  content: `"|"`,
                  color: '$text-muted',
                  opacity: 0.5,
                  position: 'absolute',
                  left: '-10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                },
              }}
            >
              <Text size="1" color="muted">
                {publication?.document?.title}
              </Text>
              {author && (
                <Text size="1" color="muted" css={{paddingRight: '$3'}}>
                  <span>Signed by </span>
                  <span style={{textDecoration: 'underline'}}>{author.profile?.alias}</span>
                </Text>
              )}

              <Text size="1" color="muted">
                Created on: {getDateFormat(state.context.publication?.document, 'createTime')}
              </Text>
              {/* <Text size="1" color="muted">
            Last modified: {getDateFormat(state.context.publication?.document, 'updateTime')}
          </Text> */}
            </Box>
          </Box>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Embed Reference</Text>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={addBookmark}>
            <Icon name="ArrowChevronDown" size="1" />
            <Text size="2">Add to Bookmarks</Text>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => onGoToPublication()}>
            <Icon name="ArrowTopRight" size="1" />
            <Text size="2">Open Embed in main Panel</Text>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    )
  }

  return null
}

const discussionItemModel = createModel(
  {
    link: null as Link | null,
    publication: null as PublicationType | null,
    block: null as FlowContent | null,
    errorMessage: '',
  },
  {
    events: {
      FETCH: (link: Link) => ({link}),
      'REPORT.FETCH.SUCCESS': (publication: PublicationType, block: FlowContent) => ({publication, block}),
      'REPORT.FETCH.ERROR': (errorMessage: string) => ({errorMessage}),
      RETRY: () => ({}),
    },
  },
)

const discussionItemMachine = discussionItemModel.createMachine({
  initial: 'idle',
  context: discussionItemModel.initialContext,
  states: {
    idle: {
      tags: ['pending'],
      on: {
        FETCH: {
          target: 'fetching',
          actions: [
            discussionItemModel.assign({
              link: (_, event) => event.link,
            }),
          ],
        },
      },
    },
    fetching: {
      tags: ['pending'],
      invoke: {
        src: (context) => (sendBack) => {
          ;(async () => {
            if (!context.link?.source) {
              sendBack(discussionItemModel.events['REPORT.FETCH.ERROR']('Error on Discussion Link'))
            } else {
              let publication = await getPublication(context.link!.source!.documentId!)
              let data = await getBlock(context.link!.source!)
              if (data && data.block) {
                sendBack(discussionItemModel.events['REPORT.FETCH.SUCCESS'](data.publication, data.block))
              }
            }
          })()
        },
      },
      on: {
        'REPORT.FETCH.SUCCESS': {
          target: 'ready',
          actions: [
            discussionItemModel.assign((_, event) => ({
              publication: event.publication,
              block: event.block,
            })),
          ],
        },
        'REPORT.FETCH.ERROR': {
          actions: [
            discussionItemModel.assign({
              errorMessage: (_, event) => event.errorMessage,
            }),
          ],
          target: 'errored',
        },
      },
    },
    errored: {
      on: {
        RETRY: 'fetching',
      },
    },
    ready: {},
  },
})
