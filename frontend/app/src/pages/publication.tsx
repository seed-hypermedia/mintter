import {
  getInfo,
  getPublication,
  listCitations,
  Publication as PublicationType,
} from '@app/client'
import {blockNodeToSlate} from '@app/client/v2/block-to-slate'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {ContextMenu} from '@app/editor/context-menu'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {EditorDocument} from '@app/editor/use-editor-draft'
import {queryKeys, useAccount} from '@app/hooks'
import {useMainPage, useParams} from '@app/main-page-context'
import {tippingMachine} from '@app/tipping-machine'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getBlock, GetBlockResult} from '@app/utils/get-block'
import {getDateFormat} from '@app/utils/get-format-date'
import {debug, error} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {
  footerButtonsStyles,
  footerMetadataStyles,
  footerStyles,
  PageFooterSeparator,
} from '@components/page-footer'
import {Placeholder} from '@components/placeholder-box'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {FlowContent} from '@mintter/mttast'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {useActor, useInterpret} from '@xstate/react'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import {useQueryClient} from 'react-query'
import {assign, createMachine, InterpreterFrom, StateFrom} from 'xstate'

export default function Publication() {
  const client = useQueryClient()
  const mainPageService = useMainPage()
  const {docId} = useParams()

  const publicationService = useInterpret(() => publicationMachine, {
    services: {
      fetchPublicationData: () => (sendBack) => {
        let {context} = mainPageService.getSnapshot()
        Promise.all([
          client.fetchQuery(
            [
              queryKeys.GET_PUBLICATION,
              context.params.docId,
              context.params.version,
            ],
            () =>
              getPublication(
                context.params.docId,
                context.params.version ?? '',
              ),
          ),
          client.fetchQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo()),
        ])
          .then(([publication, info]) => {
            if (publication.document?.children.length) {
              mainPageService.send({
                type: 'SET.CURRENT.DOCUMENT',
                document: publication.document,
              })
              let content = [blockNodeToSlate(publication.document.children)]

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
              if (publication.document?.children.length == 0) {
                sendBack({
                  type: 'PUBLICATION.REPORT.ERROR',
                  errorMessage: 'Content is Empty',
                })
              } else {
                sendBack({
                  type: 'PUBLICATION.REPORT.ERROR',
                  errorMessage: `error, fetching publication ${context.id}`,
                })
              }
            }
          })
          .catch((err) => {
            sendBack({
              type: 'PUBLICATION.REPORT.ERROR',
              errorMessage: 'error fetching',
            })
          })
      },
      fetchDiscussionData: (c) => (sendBack) => {
        let {context} = mainPageService.getSnapshot()
        client
          .fetchQuery(
            [queryKeys.GET_PUBLICATION_DISCUSSION, context.params.docId],
            () => {
              return listCitations(context.params.docId)
            },
          )
          .then((response) => {
            debug('\n\n=== LINKS: ', response.links)
            let links = response.links.filter(Boolean)
            Promise.all(links.map(({source}) => getBlock(source)))
              //@ts-ignore
              .then((result: Array<GetBlockResult>) => {
                debug('DISCUSSION BLOCK RESULT: ', result)
                sendBack({
                  type: 'DISCUSSION.REPORT.SUCCESS',
                  discussion: result,
                })
              })
          })
          .catch((error: any) => {
            sendBack({
              type: 'DISCUSSION.REPORT.ERROR',
              errorMessage: `Error fetching Discussion: ${error.message}`,
            })
          })
      },
    },
  })
  const [state, send] = useActor(publicationService)

  if (state.matches('publication.fetching')) {
    return <PublicationShell />
  }

  // start rendering
  if (state.matches('publication.errored')) {
    return (
      <Box
        css={{padding: '$5', paddingBottom: 0, marginBottom: 200}}
        data-testid="publication-wrapper"
      >
        <Text>Publication ERROR</Text>
        <Text>{state.context.errorMessage}</Text>
        <Button onClick={() => send('PUBLICATION.FETCH.DATA')} color="muted">
          try again
        </Button>
      </Box>
    )
  }

  // debug('PUB STATE: ', state.value)
  return (
    <>
      {state.matches('publication.ready') && (
        <>
          <Box
            css={{padding: '$5', paddingBottom: 0, marginBottom: 50}}
            data-testid="publication-wrapper"
          >
            <Editor
              mode={EditorMode.Publication}
              value={state.context.publication?.document.content}
              onChange={() => {
                // noop
              }}
            />
          </Box>
          <Box
            css={{
              marginBottom: 200,
              paddingHorizontal: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '$4',
            }}
          >
            <Button
              variant="ghost"
              color="primary"
              size="1"
              onClick={() => send('DISCUSSION.TOGGLE')}
            >
              {state.matches('discussion.hidden') ? 'Show ' : 'Hide '}
              Discussion/Citations
            </Button>
            <Discussion service={publicationService} />
          </Box>
        </>
      )}
      <Box className={footerStyles()}>
        <Box className={footerButtonsStyles()}>
          <Button
            onClick={() => mainPageService.send('OPEN_WINDOW')}
            size="1"
            color="primary"
          >
            New Document
          </Button>
          {state.context.canUpdate ? (
            <>
              <Button
                color="success"
                size="1"
                disabled={state.hasTag('pending')}
                data-testid="submit-edit"
                onClick={() =>
                  mainPageService.send({
                    type: 'EDIT_PUBLICATION',
                    docId,
                  })
                }
              >
                Edit
              </Button>
            </>
          ) : (
            <>
              <TippingModal
                publicationId={state.context.publication?.document.id}
                accountId={state.context.publication?.document.author}
                visible={!state.context.canUpdate}
              />
              <Button
                size="1"
                variant="outlined"
                disabled={state.hasTag('pending')}
                data-testid="submit-review"
                onClick={() => {
                  debug('Review: IMPLEMENT ME!')
                }}
              >
                Review
              </Button>
              <Button
                variant="outlined"
                size="1"
                disabled={state.hasTag('pending')}
                data-testid="submit-edit"
                onClick={() => {
                  debug('Send: IMPLEMENT ME!')
                }}
              >
                Reply
              </Button>
            </>
          )}
        </Box>
        <Box className={footerMetadataStyles()}>
          <Text size="1" color="muted">
            Created on:{' '}
            {getDateFormat(state.context.publication?.document, 'createTime')}
          </Text>
          <PageFooterSeparator />
          <Text size="1" color="muted">
            Last modified:{' '}
            {getDateFormat(state.context.publication?.document, 'updateTime')}
          </Text>
        </Box>
      </Box>
    </>
  )
}

export type ClientPublication = Omit<PublicationType, 'document'> & {
  document: EditorDocument
}

export type PublicationContext = {
  publication: ClientPublication | null
  errorMessage: string
  canUpdate: boolean
  discussion: Array<GetBlockResult>
}

export type PublicationEvent =
  | {type: 'PUBLICATION.FETCH.DATA'}
  | {
      type: 'PUBLICATION.REPORT.SUCCESS'
      publication: ClientPublication
      canUpdate?: boolean
    }
  | {type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string}
  | {type: 'DISCUSSION.FETCH.DATA'}
  | {type: 'DISCUSSION.SHOW'}
  | {type: 'DISCUSSION.HIDE'}
  | {type: 'DISCUSSION.TOGGLE'}
  | {type: 'DISCUSSION.REPORT.SUCCESS'; discussion: Array<GetBlockResult>}
  | {type: 'DISCUSSION.REPORT.ERROR'; errorMessage: string}

export const publicationMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBaAW31wAtsywA6CbWXVWWUs5hiBDBkAxABEAkgGUAwgFUpUiQHkAcsykAJZQHVEKEj2Ll9IAB6IATAGYArM0sBGAAwBOW48sA2ABy3XbgDsADQgAJ6I1gAsXsxRzgmWtoFeHo6BAL4ZoWhYeES81LQMTKzsnNy8-NiCwuLS8ooq6gAqygDi7QAyAKKmyIbYxmSmFgiWSQ4u7p6+-kGhEQjWrlFxCc5OgXaWfl5ZORg4BMNF9IwsbBxcPOTMAG7s2FgsYABObyRvkPWyCkpqZgAMR6LRkmmYYgAgi0of1BsNRohXJZXMxks5rBMbD5Av4vIsrFE0RsEikfM4Yo4oplsiBcscCuQziVLuUblVHjwXswAGZgQjnMhQX6NAHqABKPQACsoJS0NHIZDIeop4UZeEiED4dcxKXMoh5bJtrNZCcsfGtSdZAjYkv5LAd6Ud8qcaEK2ddKncuc9MCx+YKSiLJH8moCpbL5cwehKJXL1UNNUhzIgdT49TE-IbHMabGbwlZXIE9dbUs4vNYnQzXYV3ayyl7bnxfTyav6RInESmxpWM5YooOfJ4Ys5HAWlkbSwkvK5h3ZiY5qy6TnXihdGxVmw8ni9Rf9msxNBIxH0UwMNSYe1Zc1M3B5vH4AsXzVFh+sEuPTXPMVW6TXV2ZesNyuLdOV3DtQzFQ82k6Xou2TUAxhsewnHvWYnwWQtxjnD9NmLVZVj8Zc8kAyhgNKACmT4dswE7c8EUQ1MEEcAJmFcDi5x8Vx0lcStrB8c09gcY1c0CKJLExY0-0OUjqJZDcqOGZh3k+b4IBEaU5AAIS6CQZBhQ8QTBCFoVhBCryQxA8WcZgfDsPxbRWRxuKic0AliDZc2sZxbBiDj9n-Fd5IolglKqQMhRFLTdP0wyIxlOUFSkJUVTVBjLxGa8EECNxmCxMdi2scc5wnay2K85xcW8WxbGKkjGTdddKOC5TIuDTSdL0gyWkPSMkpjOMEwypNLOY3K0QK1jthK+zzRcCZp3wmkCs2LI6TIEghHgc9WrXD1Nw5O4BCELKDEyrVbXNHzYi8DZiq8PE6tSWlZMa-aG1Ao6WwglhvnwCAlnO0azuYxxHC8NZtiiaJIdq6w7rKhA32sJa7sscSIfshrayA5rPTAn1fpUj4vkgCzQbGcHIeYaHYcNZ7MWuzFmAhx6NlcLFtlcHGyIU0ovu9H7uX9PkBSiimtRWzNfHs3y+MrCtrox2njUpaJDScLwlyCuSmoOwXt1bUXaMl7Lwc8BxLQHHYohcmJzS8FXAh8bW-CxKkJl5kL8cOoWdxFsAzas5HiRlnUfPxRWCWw9JPK81jUQmbZAre3HyN9w2mIvEGpcE2OWdJCH0kCDisVsb39YbcK7lNkbuxDq7sL8Wykk2ZxAk8CHfIr3X3rxg6a74VSyYgYPmLLq3wY41FPFxRx3JhuzTXiYrKUtV3K4+xS9rudrGCgcfkNWfLJO8F2EcxCTbCEy2bJcSs8WHYct4H6vd74f7AaP5FOan1iUQ8V2J3W+GZSRzlSNNGGr8M6Dw-j-ZG+clidxLKSW0XcKRVRgfzIO9cmLITcthHyS1vKSQrJzLwgUshAA */
  createMachine(
    {
      context: {
        publication: null,
        errorMessage: '',
        canUpdate: false,
        discussion: [],
      },
      tsTypes: {} as import('./publication.typegen').Typegen0,
      schema: {
        context: {} as PublicationContext,
        events: {} as PublicationEvent,
      },
      type: 'parallel',
      id: 'publication-machine',
      states: {
        discussion: {
          initial: 'hidden',
          states: {
            hidden: {
              on: {
                'DISCUSSION.SHOW': {
                  target: 'visible',
                },
                'DISCUSSION.TOGGLE': {
                  target: 'visible',
                },
              },
            },
            visible: {
              initial: 'fetching',
              states: {
                ready: {
                  entry: (context, event) => {
                    // debug(
                    //   'DISCUSSION READY: ',
                    //   JSON.stringify({context, event}, null, 3),
                    // )
                  },
                },
                errored: {
                  on: {
                    'DISCUSSION.FETCH.DATA': {
                      target: 'fetching',
                    },
                  },
                },
                fetching: {
                  invoke: {
                    src: 'fetchDiscussionData',
                    id: 'fetchDiscussionData',
                  },
                  tags: 'pending',
                  on: {
                    'DISCUSSION.REPORT.SUCCESS': {
                      actions: 'assignDiscussion',
                      target: 'ready',
                    },
                    'DISCUSSION.REPORT.ERROR': {
                      actions: 'assignError',
                      target: 'errored',
                    },
                  },
                },
                idle: {
                  always: [
                    {
                      cond: 'isCached',
                      target: 'ready',
                    },
                    {
                      target: 'fetching',
                    },
                  ],
                },
              },
              on: {
                'DISCUSSION.HIDE': {
                  target: 'hidden',
                },
                'DISCUSSION.TOGGLE': {
                  target: 'hidden',
                },
              },
            },
          },
        },
        publication: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                target: 'fetching',
              },
            },
            errored: {
              on: {
                'PUBLICATION.FETCH.DATA': {
                  actions: ['clearError', 'clearDiscussion'],
                  target: 'fetching',
                },
              },
            },
            fetching: {
              invoke: {
                src: 'fetchPublicationData',
                id: 'fetchPublicationData',
              },
              tags: 'pending',
              on: {
                'PUBLICATION.REPORT.SUCCESS': {
                  actions: ['assignPublication', 'assignCanUpdate'],
                  target: 'ready',
                },
                'PUBLICATION.REPORT.ERROR': {
                  actions: 'assignError',
                  target: 'errored',
                },
              },
            },
            ready: {},
          },
        },
      },
    },
    {
      guards: {
        isCached: () => false,
      },
      actions: {
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignCanUpdate: assign({
          canUpdate: (_, event) => Boolean(event.canUpdate),
        }),
        assignDiscussion: assign({
          discussion: (_, event) => event.discussion,
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

  // useEffect(() => {
  //   if (publicationId && accountId) {
  //     send({
  //       type: 'TIPPING.SET.TIP.DATA',
  //       publicationID: publicationId,
  //       accountID: accountId,
  //     })
  //   }
  // }, [publicationId, accountId])

  if (typeof publicationId == 'undefined' || typeof accountId == 'undefined') {
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
          variant="outlined"
          color="success"
          onClick={() => {
            send('OPEN')
          }}
        >
          Tip Author
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content>
        {state.matches('open.setAmount') && (
          <SetAmount state={state} send={send} />
        )}
        {state.matches('open.requestInvoice') ||
          (state.matches('open.paying') && (
            <Box
              css={{
                padding: '$5',
                width: '300px',
                backgroundColor: '$base-component-bg-normal',
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
              backgroundColor: '$base-component-bg-normal',
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
            <Button
              size="1"
              type="submit"
              css={{width: '$full'}}
              onClick={() => send('RETRY')}
            >
              Retry
            </Button>
          </Box>
        )}
        {state.matches('open.readyToPay') && (
          <Box
            css={{
              padding: '$5',
              width: '300px',
              backgroundColor: '$base-component-bg-normal',
              display: 'flex',
              flexDirection: 'column',
              gap: '$4',
              boxShadow: '$3',
              svg: {
                width: '100%',
              },
            }}
          >
            <QRCode
              title="demo demo"
              value={state.context.invoice}
              size={300 - 32}
            />
            <Box>
              <Text size="1" fontWeight="bold">
                Invoice:
              </Text>
              <Text
                size="1"
                css={{wordBreak: 'break-all', wordWrap: 'break-word'}}
              >
                {state.context.invoice}
              </Text>
            </Box>
            <Button
              size="1"
              css={{width: '$full'}}
              onClick={() => send('TIPPING.PAY.INVOICE')}
            >
              Pay Directly
            </Button>
          </Box>
        )}
        {state.matches('open.success') && (
          <Box
            css={{
              padding: '$5',
              width: '300px',
              backgroundColor: '$base-component-bg-normal',
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

function SetAmount({
  send,
  state,
}: {
  state: StateFrom<typeof tippingMachine>
  send: any
}) {
  return (
    <Box
      css={{
        padding: '$5',
        width: '300px',
        backgroundColor: '$base-component-bg-normal',
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
            onChange={(e) =>
              send({
                type: 'TIPPING.UPDATE.AMOUNT',
                amount: Number(e.target.value),
              })
            }
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

type DiscussionProps = {
  service: InterpreterFrom<typeof publicationMachine>
}

function Discussion({service}: DiscussionProps) {
  const [state] = useActor(service)

  if (state.matches('discussion.visible.fetching')) {
    return <span>loading discussion...</span>
  }

  if (state.matches('discussion.visible.errored')) {
    error('Discussion Error')
    return <span>Discussion ERROR</span>
  }

  if (state.matches('discussion.visible.ready')) {
    return (
      <Box
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: '$4',
          paddingHorizontal: '$4',
        }}
      >
        {state.context.discussion.map((entry) => (
          <DiscussionItem
            key={`${entry.publication.document?.id}/${entry.publication.version}/${entry.block?.id}`}
            entry={entry}
          />
        ))}
      </Box>
    )
  }

  return null
}

function DiscussionItem({entry}: {entry: GetBlockResult}) {
  const {data: author} = useAccount(entry.publication.document?.author)
  const bookmarkService = useBookmarksService()
  const mainPageService = useMainPage()

  let url =
    entry.publication.document && entry.block
      ? `${MINTTER_LINK_PREFIX}${entry.publication.document?.id}/${entry.publication.version}/${entry?.block.id}`
      : ''

  function addBookmark() {
    bookmarkService.send({
      type: 'BOOKMARK.ADD',
      url,
    })
  }

  async function onCopy() {
    await copyTextToClipboard(url)
    toast.success('Embed Reference copied successfully', {
      position: 'top-center',
    })
  }

  function onGoToPublication() {
    mainPageService.send({
      type: 'goToPublication',
      docId: entry.publication.document!.id,
      version: entry.publication.version,
      blockId: 'hola',
    })
  }

  const {block, publication} = entry

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
          <Editor
            mode={EditorMode.Discussion}
            value={entry.publication.document.content}
          />

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
                color: '$base-text-low',
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
                <span style={{textDecoration: 'underline'}}>
                  {author.profile?.alias}
                </span>
              </Text>
            )}

            <Text size="1" color="muted">
              Created on:{' '}
              {getDateFormat(entry.publication?.document, 'createTime')}
            </Text>
            <Text size="1" color="muted">
              Last modified:{' '}
              {getDateFormat(entry.publication?.document, 'updateTime')}
            </Text>
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
        <ContextMenu.Item
          onSelect={() =>
            mainPageService.send({
              type: 'OPEN_WINDOW',
              path: `/p/${entry.publication.document?.id}/${entry.publication.version}/${entry.block?.id}`,
            })
          }
        >
          <Icon name="OpenInNewWindow" size="1" />
          <Text size="2">Open Embed in new Window</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}

function PublicationShell() {
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
    <Box
      css={{
        width: '$prose-width',
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
      }}
    >
      <Placeholder css={{height: 24, width: '$full'}} />
      <Placeholder css={{height: 24, width: '92%'}} />
      <Placeholder css={{height: 24, width: '84%'}} />
      <Placeholder css={{height: 24, width: '90%'}} />
    </Box>
  )
}

function filterBlocks(entry: Array<GetBlockResult>): Array<FlowContent> {
  let result: Array<FlowContent> = []

  entry.forEach((item) => {
    if (item) {
      result.push(item.block)
    }
  })
  return result
}
