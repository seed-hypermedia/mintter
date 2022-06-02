import {getInfo, getPublication, listCitations} from '@app/client'
import {blockNodeToSlate} from '@app/client/v2/block-to-slate'

import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {queryKeys} from '@app/hooks'
import {useMainPage, useParams} from '@app/main-page-context'
import {publicationMachine} from '@app/publication-machine'
import {getBlock, GetBlockResult} from '@app/utils/get-block'
import {getDateFormat} from '@app/utils/get-format-date'
import {debug} from '@app/utils/logger'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Discussion} from '@components/discussion'
import {
  footerButtonsStyles,
  footerMetadataStyles,
  footerStyles,
  PageFooterSeparator,
} from '@components/page-footer'
import {Placeholder} from '@components/placeholder-box'
import {Text} from '@components/text'
import {TippingModal} from '@components/tipping-modal'
import {useActor, useInterpret} from '@xstate/react'
import {useQueryClient} from 'react-query'

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
