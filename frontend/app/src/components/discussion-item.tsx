import {Link} from '@app/client'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {FileProvider} from '@app/file-provider'
import {useMain, usePublicationList} from '@app/main-context'
import {PublicationRef} from '@app/main-machine'
import {getRefFromParams} from '@app/utils/machine-utils'
import {Box} from '@components/box'
import {FileTime} from '@components/file-time'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {useEffect, useMemo} from 'react'

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
}

export function DiscussionItem({link}: DiscussionItemProps) {
  let fileRef = useDiscussionFileRef(link)

  if (fileRef) {
    return <DiscussionEditor fileRef={fileRef} />
  }

  return null
}

function DiscussionEditor({fileRef}: {fileRef: PublicationRef}) {
  const mainService = useMain()
  let [state] = useActor(fileRef)

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
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        console.log('ISCLLAPSED?', !window.getSelection()?.isCollapsed)
        if (window.getSelection()?.isCollapsed) {
          mainService.send({
            type: 'GO.TO.PUBLICATION',
            docId: state.context.documentId,
            version: state.context.version,
          })
        }
        // TODO: make sure we can click in the event and also let the text selection
      }}
    >
      <Box
        css={{
          position: 'sticky',
          top: 0,
          zIndex: '$4',
          display: 'flex',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          paddingBlock: '1rem',
          gap: '1ch',
          paddingInline: '1rem',
          backgroundColor: '$base-background-normal',
        }}
      >
        {state.context.author && (
          <Text size="1" color="muted" css={{textDecoration: 'underline'}}>
            {state.context.author.profile?.alias}
          </Text>
        )}
        {/* @ts-ignore */}
        {state.context.publication?.document?.content && (
          <FileTime
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
