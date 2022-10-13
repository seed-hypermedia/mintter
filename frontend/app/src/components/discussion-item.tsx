import {Link} from '@app/client'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {useMain, usePublicationList} from '@app/main-context'
import {PublicationRef} from '@app/main-machine'
import {getRefFromParams} from '@app/utils/machine-utils'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {FileTime} from '@components/file-time'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {MouseEvent, useEffect, useMemo} from 'react'

function useDiscussionFileRef(link: Link) {
  let pubList = usePublicationList()
  return useMemo(memoFileRef, [link, pubList])

  function memoFileRef() {
    if (!link.source) return undefined
    let linkRef = getRefFromParams(
      'pub',
      link.source.documentId,
      link.source.version,
    )
    let selectedPublication = pubList.find((p) => p.ref.id == linkRef)
    if (selectedPublication) {
      return selectedPublication.ref
    }
  }
}

type DiscussionItemProps = {
  link: Link
  handleClick?: () => void
}

export function DiscussionItem({link, handleClick}: DiscussionItemProps) {
  let fileRef = useDiscussionFileRef(link)

  if (fileRef) {
    return <DiscussionEditor handleClick={handleClick} fileRef={fileRef} />
  }

  return null
}

function DiscussionEditor({
  fileRef,
  handleClick,
}: {
  fileRef: PublicationRef
  handleClick?: () => void
}) {
  const mainService = useMain()
  let [state] = useActor(fileRef)

  function _handleClick(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (window.getSelection()?.isCollapsed) {
      if (handleClick) {
        handleClick()
      } else {
        mainService.send({
          type: 'GO.TO.PUBLICATION',
          docId: state.context.documentId,
          version: state.context.version,
        })
      }
    }
    // TODO: make sure we can click in the event and also let the text selection
  }

  useEffect(() => {
    fileRef.send('LOAD')
    fileRef.send('DISCUSSION.SHOW')
    return () => {
      fileRef.send('UNLOAD')
    }
  }, [fileRef])

  return (
    <Box
      css={{
        width: '$full',
        paddingBlockEnd: '2rem',
        '&:hover': {
          cursor: 'pointer',
          backgroundColor: '$base-background-normal',
        },
      }}
      data-testid="discussion-item-wrapper"
      onClick={_handleClick}
    >
      <Box
        css={{
          top: 0,
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          paddingBlock: '1rem',
          gap: '1ch',
          paddingInline: '1rem',
          backgroundColor: '$base-background-normal',
        }}
      >
        {state.context.author && (
          <>
            <Avatar
              size={1}
              alias={state.context.author.profile?.alias || 'U'}
            />
            <Text
              size="1"
              color="muted"
              css={{textDecoration: 'underline'}}
              data-testid="discussion-item-alias"
            >
              {state.context.author.profile?.alias}
            </Text>
          </>
        )}
        {/* @ts-ignore */}
        {state.context.publication?.document?.content && (
          <FileTime
            data-testid="discussion-item-date"
            type="pub"
            document={state.context.publication?.document}
            noLabel
          />
        )}
      </Box>
      {state.matches('publication.ready') && (
        <Box
          css={{
            marginInlineStart: '-1rem',
            paddingInlineEnd: '1rem',
          }}
        >
          {state.context.publication?.document?.content && (
            <FileProvider value={fileRef}>
              <Editor
                mode={EditorMode.Discussion}
                value={state.context.publication.document.content}
                editor={state.context.editor}
                onChange={() => {
                  // noop
                }}
              />
            </FileProvider>
          )}
        </Box>
      )}
    </Box>
  )
}
