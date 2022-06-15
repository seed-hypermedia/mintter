import {mainService as defaultMainService} from '@app/app-providers'
import {Link, LinkNode} from '@app/client'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {PublicationRef} from '@app/main-page-machine'
import {getDateFormat} from '@app/utils/get-format-date'
import {debug} from '@app/utils/logger'
import {getRefFromParams} from '@app/utils/machine-utils'
import {Box} from '@components/box'
import {Text} from '@components/text'
import {useActor, useSelector} from '@xstate/react'
import {useEffect} from 'react'

function useDiscussionFileRef(
  mainService: typeof defaultMainService,
  source: LinkNode,
) {
  return useSelector(mainService, (state) => {
    let linkRef = getRefFromParams('pub', source.documentId, source.version)
    let pubList = state.context.publicationList
    let pubRef = pubList.find((p) => p.ref.id == linkRef)!.ref
    return pubRef
  })
}

type DiscussionItemProps = {
  link: Link
  mainService?: typeof defaultMainService
}

export function DiscussionItem({
  link,
  mainService = defaultMainService,
}: DiscussionItemProps) {
  let fileRef = useDiscussionFileRef(mainService, link.source!)

  return <DiscussionEditor fileRef={fileRef} />
}

function DiscussionEditor({fileRef}: {fileRef: PublicationRef}) {
  let [state, send] = useActor(fileRef)

  useEffect(() => {
    fileRef.send('LOAD')
    return () => {
      fileRef.send('UNLOAD')
    }
  }, [fileRef])

  debug('DiscussionEditor', state.context.author)

  return (
    <Box
      css={{
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        '&:hover': {
          cursor: 'pointer',
        },
      }}
    >
      {state.matches('publication.ready') && (
        <Box
          css={{
            marginLeft: -32,
          }}
        >
          {state.context.publication?.document?.content && (
            <FileProvider
              value={{
                type: 'pub',
                documentId: state.context.documentId,
                version: state.context.version,
              }}
            >
              <Editor
                mode={EditorMode.Discussion}
                value={state.context.publication!.document!.content}
                editor={state.context.editor}
                onChange={() => {
                  // noop
                }}
              />
            </FileProvider>
          )}
        </Box>
      )}
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
          {state.context.title}
        </Text>
        {state.context.author && (
          <Text size="1" color="muted" css={{paddingRight: '$3'}}>
            <span>Signed by </span>
            <span style={{textDecoration: 'underline'}}>
              {state.context.author.profile?.alias}
            </span>
          </Text>
        )}

        <Text size="1" color="muted">
          Created on:{' '}
          {getDateFormat(state.context.publication?.document, 'createTime')}
        </Text>
        <Text size="1" color="muted">
          Last modified:{' '}
          {getDateFormat(state.context.publication?.document, 'updateTime')}
        </Text>
      </Box>
    </Box>
  )
}
