import {createDraft, getInfo, getPublication, Link, listCitations, Publication as PublicationType} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {useCitationService} from '@app/editor/citations'
import {ContextMenu} from '@app/editor/context-menu'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {EditorDocument} from '@app/editor/use-editor-draft'
import {queryKeys, useAccount} from '@app/hooks'
import {tippingMachine} from '@app/tipping-machine'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getBlock} from '@app/utils/get-block'
import {getDateFormat} from '@app/utils/get-format-date'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Placeholder} from '@components/placeholder-box'
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
import {assign, createMachine, StateFrom} from 'xstate'
import {PublicationPageProps} from './types'

export default function Publication({params}: PublicationPageProps) {
  const client = useQueryClient()
  //@ts-ignore
  const [, setLocation] = useLocation()
  const citations = useCitationService()

  const [state, send] = usePagePublication(client, params?.docId, params?.version)

  const {data: author} = useAccount(state.context.publication?.document?.author, {
    enabled: !!state.context.publication?.document?.author,
  })

  useEffect(() => {
    if (params?.docId) {
      send({type: 'PUBLICATION.FETCH.DATA', id: params.docId, version: params.version})
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

  // if (state.matches('fetching')) {
  //   return null
  // }

  if (state.matches('fetching')) {
    return <PublicationShell />
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
        <Button
          onClick={() => send({type: 'PUBLICATION.FETCH.DATA', id: state.context.id, version: state.context.version})}
          color="muted"
        >
          try again
        </Button>
      </Box>
    )
  }

  console.log(state.value, state.context)

  return (
    <>
      <Box
        css={{
          background: '$background-alt',
          borderBottom: '1px solid $colors$hover',
          position: 'sticky',
          top: 0,
          zIndex: '$4',
          padding: '$3',
          paddingLeft: 40,
          $$gap: 16,
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
          onClick={() => send('TOGGLE.DISCUSSION')}
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
        <Box css={{padding: '$7', paddingLeft: 0}} data-testid="publication-wrapper">
          <Editor
            mode={EditorMode.Publication}
            value={state.context.publication?.document.content}
            onChange={() => {
              // noop
            }}
          />
        </Box>
      )}
      {state.matches('discussion') && (
        <Box data-testid="publication-wrapper" css={{padding: '$7'}}>
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
      )}
      <Box
        css={{
          background: '$background-alt',
          width: '$full',
          position: 'absolute',
          bottom: 0,
          zIndex: '$4',
          padding: '$5',
          paddingLeft: 40,
          '&:after': {
            content: '',
            position: 'absolute',
            width: '$full',
            height: 20,
            background: 'linear-gradient(0deg, $colors$background-alt 0%, rgba(255,255,255,0) 100%)',
            top: -20,
            left: 0,
          },
          $$gap: 24,
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

function usePagePublication(client: QueryClient, docId?: string, version?: string) {
  const service = useInterpret(() => publicationMachine, {
    services: {
      fetchPublicationData: (context) => (sendBack) => {
        Promise.all([
          client.fetchQuery([queryKeys.GET_PUBLICATION, context.id, context.version], () =>
            getPublication(context.id, context.version),
          ),
          client.fetchQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo()),
        ])
          .then(([publication, info]) => {
            if (publication.document?.content) {
              let content = JSON.parse(publication.document?.content)
              sendBack({
                type: 'PUBLICATION.REPORT.SUCCESS',
                publication: Object.assign(publication, {
                  document: {
                    ...publication.document,
                    content,
                  },
                }),
                canUpdate: info.accountId == publication.document.author,
              })
            } else {
              if (publication.document?.content === '') {
                sendBack({type: 'PUBLICATION.REPORT.ERROR', errorMessage: 'Content is Empty'})
              } else {
                sendBack({type: 'PUBLICATION.REPORT.ERROR', errorMessage: 'error parsing content'})
              }
            }
          })
          .catch((err) => {
            sendBack({type: 'PUBLICATION.REPORT.ERROR', errorMessage: 'error fetching'})
          })
      },
      fetchDiscussionData: (context) => (sendBack) => {
        client
          .fetchQuery([queryKeys.GET_PUBLICATION_DISCUSSION, context.id, context.version, ''], () =>
            listCitations(context.id),
          )
          .then((response) => {
            Promise.all(response.links.map(({source}) => getBlock(source)))
              //@ts-ignore
              .then((result: Array<FlowContent>) => {
                let discussion = document([group(result)])

                sendBack({type: 'REPORT.DISCUSSION.SUCCESS', links: response.links, discussion})
              })
          })
          .catch((error: any) => {
            sendBack({
              type: 'REPORT.DISCUSSION.ERROR',
              errorMessage: `Error fetching Discussion: ${error.message}`,
            })
          })
      },
    },
  })
  const [state, send] = useActor(service)

  useEffect(() => {
    if (docId) {
      send({type: 'PUBLICATION.FETCH.DATA', id: docId, version})
    }
  }, [send, docId])

  return [state, send] as const
}

export type ClientPublication = Omit<PublicationType, 'document'> & {document: EditorDocument}

export type PublicationContextType = {
  id: string
  version: string
  publication: ClientPublication | null
  errorMessage: string
  canUpdate: boolean
  links: Array<Link> | null
  discussion: Document | null
}

export type PublicationEvent =
  | {type: 'PUBLICATION.FETCH.DATA'; id: string; version?: string}
  | {type: 'PUBLICATION.REPORT.SUCCESS'; publication: ClientPublication; canUpdate?: boolean}
  | {type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string}
  | {type: 'TOGGLE.DISCUSSION'}
  | {type: 'REPORT.DISCUSSION.SUCCESS'; links: Array<Link>; discussion: any}
  | {type: 'REPORT.DISCUSSION.ERROR'; errorMessage: string}

export const publicationMachine = createMachine(
  {
    context: {
      id: '',
      version: '',
      publication: null,
      errorMessage: '',
      canUpdate: false,
      links: [],
      discussion: null,
    },
    tsTypes: {} as import('./publication.typegen').Typegen0,
    schema: {context: {} as PublicationContextType, events: {} as PublicationEvent},
    id: 'publication-machine',
    initial: 'idle',
    states: {
      idle: {
        on: {
          'PUBLICATION.FETCH.DATA': {
            actions: ['assignId', 'assignVersion'],
            target: '#publication-machine.fetching',
          },
        },
      },
      fetching: {
        tags: ['pending'],
        invoke: {
          src: 'fetchPublicationData',
        },
        on: {
          'PUBLICATION.REPORT.SUCCESS': {
            actions: ['assignPublication', 'assignCanUpdate'],
            target: '#publication-machine.ready',
          },
          'PUBLICATION.REPORT.ERROR': {
            actions: 'assignError',
            target: '#publication-machine.errored',
          },
        },
      },
      ready: {
        on: {
          'PUBLICATION.FETCH.DATA': {
            actions: ['assignId', 'assignVersion'],
            target: '#publication-machine.fetching',
          },
          'TOGGLE.DISCUSSION': {
            target: '#publication-machine.discussion',
          },
        },
      },
      discussion: {
        initial: 'idle',
        states: {
          idle: {
            always: [
              {
                cond: 'isDiscussionFetched',
                target: '#publication-machine.discussion.fetching',
              },
              {
                target: '#publication-machine.discussion.ready',
              },
            ],
          },
          fetching: {
            tags: ['pending'],
            invoke: {
              src: 'fetchDiscussionData',
              id: 'fetchDiscussionData',
            },
            on: {
              'REPORT.DISCUSSION.SUCCESS': {
                actions: ['assignLinks', 'assignDiscussion'],
                target: '#publication-machine.discussion.ready',
              },
              'REPORT.DISCUSSION.ERROR': {
                actions: 'assignError',
                target: '#publication-machine.discussion.finish',
              },
            },
          },
          ready: {
            on: {
              'TOGGLE.DISCUSSION': {
                target: '#publication-machine.discussion.finish',
              },
              'PUBLICATION.FETCH.DATA': {
                actions: ['clearLinks', 'clearDiscussion', 'clearError'],
                target: '#publication-machine.discussion.finish',
              },
            },
          },
          errored: {
            on: {
              'TOGGLE.DISCUSSION': {
                actions: ['clearLinks', 'clearDiscussion', 'clearError'],
                target: '#publication-machine.discussion.fetching',
              },
            },
          },
          finish: {
            type: 'final',
          },
        },
        onDone: [
          {
            target: '#publication-machine.ready',
          },
        ],
      },
      errored: {
        on: {
          'PUBLICATION.FETCH.DATA': {
            actions: ['assignId', 'assignVersion'],
            target: '#publication-machine.fetching',
          },
        },
      },
    },
  },
  {
    guards: {
      isDiscussionFetched: (context) => {
        return context.links != null
      },
    },
    actions: {
      assignId: assign({
        id: (_, event) => event.id,
      }),
      assignVersion: assign({
        version: (_, event) => event.version || '',
      }),
      assignPublication: assign({
        publication: (_, event) => event.publication,
      }),
      assignCanUpdate: assign({
        canUpdate: (_, event) => Boolean(event.canUpdate),
      }),
      assignDiscussion: assign({
        discussion: (_, event) => event.discussion,
      }),
      assignLinks: assign({
        links: (_, event) => event.links,
      }),
      assignError: assign({
        errorMessage: (_, event) => event.errorMessage,
      }),
      clearDiscussion: assign({
        discussion: (context) => null,
      }),
      clearError: assign({
        errorMessage: (context) => '',
      }),
      clearLinks: assign({
        links: (context) => null,
      }),
    },
  },
)

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
      send({type: 'TIPPING.SET.TIP.DATA', publicationID: publicationId, accountID: accountId})
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
          send('OPEN')
        } else {
          send('CLOSE')
        }
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <Button
          size="1"
          variant="ghost"
          color="success"
          onClick={() => {
            send('OPEN')
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
            <Button size="1" type="submit" css={{width: '$full'}} onClick={() => send('RETRY')}>
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
            <Button size="1" css={{width: '$full'}} onClick={() => send('TIPPING.PAY.INVOICE')}>
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
            onChange={(e) => send({type: 'TIPPING.UPDATE.AMOUNT', amount: Number(e.target.value)})}
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
              onClick={() => send('TIPPING.REQUEST.INVOICE')}
            >
              Request Invoice
            </Button>
          </Box>
        </Box>
      }
    </Box>
  )
}

function Discussion({links}: {links: Array<Link> | null}) {
  if (!links) return null
  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$4',
      }}
    >
      {links.map((link) => (
        <DiscussionItem
          key={`${link.source?.documentId}-${link.target?.documentId}-${link.target?.blockId}`}
          link={link}
        />
      ))}
    </Box>
  )
}

function DiscussionItem({link}: {link: Link}) {
  const client = useQueryClient()
  const [state, send] = useMachine(() => createDiscussionMachine(client))
  const {data: author} = useAccount(state?.context?.publication?.document?.author)
  const bookmarkService = useBookmarksService()
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
    send({type: 'FETCH', link})
  }, [])

  if (state.hasTag('pending')) {
    return null
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

type DiscussionContextType = {
  link: Link | null
  publication: PublicationType | null
  block: FlowContent | null
  errorMessage: string
}

type DiscussionEvent =
  | {type: 'FETCH'; link: Link}
  | {type: 'REPORT.FETCH.SUCCESS'; publication: PublicationType; block: FlowContent}
  | {type: 'REPORT.FETCH.ERROR'; errorMessage: Error['message']}
  | {type: 'RETRY'}

export function createDiscussionMachine(client: QueryClient) {
  return createMachine(
    {
      tsTypes: {} as import('./publication.typegen').Typegen1,
      schema: {
        context: {} as DiscussionContextType,
        events: {} as DiscussionEvent,
      },
      initial: 'idle',
      context: {
        link: null,
        publication: null,
        block: null,
        errorMessage: '',
      },
      states: {
        idle: {
          tags: ['pending'],
          on: {
            FETCH: {
              target: 'fetching',
              actions: ['assignLink'],
            },
          },
        },
        fetching: {
          tags: ['pending'],
          invoke: {
            src: (context) => (sendBack) => {
              if (!context.link?.source) {
                sendBack({type: 'REPORT.FETCH.ERROR', errorMessage: 'Error on Discussion Link'})
              } else {
                getBlock(context.link!.source!).then((data) => {
                  if (data && data.block) {
                    sendBack({type: 'REPORT.FETCH.SUCCESS', publication: data.publication, block: data.block})
                  }
                })
              }
            },
          },
          on: {
            'REPORT.FETCH.SUCCESS': {
              target: 'ready',
              actions: ['assignPublication', 'assignBlock'],
            },
            'REPORT.FETCH.ERROR': {
              actions: ['assignError'],
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
    },
    {
      actions: {
        assignLink: assign({
          link: (_, event) => event.link,
        }),
        assignBlock: assign({
          block: (_, event) => event.block,
        }),
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
      },
    },
  )
}

function PublicationShell() {
  const [state] = useMachine(
    createMachine({
      initial: 'idle',
      states: {
        idle: {
          after: {
            100: {
              target: 'delayed',
            },
          },
        },
        delayed: {
          type: 'final',
        },
      },
    }),
  )

  return (
    <Box
      css={{
        width: '$full',
        padding: '$7',
        paddingTop: '$9',
        display: 'flex',
        flexDirection: 'column',
        gap: '$7',
      }}
    >
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </Box>
  )
}

function BlockPlaceholder() {
  return (
    <Box css={{width: '$prose-width', display: 'flex', flexDirection: 'column', gap: '$3'}}>
      <Placeholder css={{height: 24, width: '$full'}} />
      <Placeholder css={{height: 24, width: '92%'}} />
      <Placeholder css={{height: 24, width: '84%'}} />
      <Placeholder css={{height: 24, width: '90%'}} />
    </Box>
  )
}
