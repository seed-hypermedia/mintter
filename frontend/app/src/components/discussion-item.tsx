import { mainService as defaultMainService } from '@app/app-providers'
import { Link, LinkNode } from '@app/client'
import { Editor } from '@app/editor/editor'
import { EditorMode } from '@app/editor/plugin-utils'
import { FileProvider } from '@app/file-provider'
import { PublicationRef } from '@app/main-machine'
import { getRefFromParams } from '@app/utils/machine-utils'
import { Box } from '@components/box'
import { FileTime } from '@components/file-time'
import { Text } from '@components/text'
import { useActor, useSelector } from '@xstate/react'
import { useEffect } from 'react'

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

  return <DiscussionEditor fileRef={fileRef} mainService={mainService} />
}

function DiscussionEditor({
  fileRef,
  mainService,
}: {
  fileRef: PublicationRef
  mainService: typeof defaultMainService
}) {
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
      onClick={() => {
        // TODO: make sure we can click in the event and also let the text selection
        // mainService.send({
        //   type: 'GO.TO.PUBLICATION',
        //   docId: state.context.documentId,
        //   version: state.context.version,
        // })
      }}
    >
      <Box
        css={{
          position: 'sticky',
          top: 0,
          zIndex: '$4',
          display: 'flex',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          paddingBlockStart: '1rem',
          gap: '1ch',
          paddingInline: '1rem',
          backgroundColor: '$base-background-normal'
        }}
      >
        {state.context.author && (
          <Text size="1" color="muted" css={{ textDecoration: 'underline' }}>
            {state.context.author.profile?.alias}
          </Text>
        )}
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
    </Box>
  )
}
