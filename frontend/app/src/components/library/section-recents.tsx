import {useFileFromRef, useMain, useRecents} from '@app/main-context'
import {createPublicationMachine} from '@app/publication-machine'
import {css} from '@app/stitches.config'
import {StyledItem} from '@components/library/library-item'
import {Section} from '@components/library/section'
import {useActor} from '@xstate/react'
import {MouseEvent, useMemo} from 'react'
import {StateFrom} from 'xstate'

export function RecentsSection() {
  let recents = useRecents()
  return (
    <Section title="Recents" icon="Clock">
      {recents.length
        ? recents.map((fileRef) => (
            <RecentItemWrapper key={fileRef} fileRef={fileRef} />
          ))
        : null}
    </Section>
  )
}

var listItemStyle = css({
  '& a': {
    display: 'block',
    width: '$full',
    textDecoration: 'none',
    color: 'inherit',
    fontFamily: '$base',
    fontSize: '$2',
  },
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-hover',
  },
})

type RecentItemProps = {
  fileRef: string
}

function RecentItemWrapper({fileRef}: RecentItemProps) {
  const file = useFileFromRef(fileRef)

  if (file) {
    return <RecentItem file={file} />
  }

  return null
}

function RecentItem({file}: {file: ReturnType<typeof useFileFromRef>}) {
  const mainService = useMain()
  let [state] = useActor(file)

  let isDraft = useMemo(() => file.id.startsWith('draft'), [file.id])

  function goToDocument(event: MouseEvent) {
    event.preventDefault()
    if (isDraft) {
      mainService.send({
        type: 'GO.TO.DRAFT',
        docId: state.context.documentId,
      })
    } else {
      // TODO: here we might be missing the blockId from the URL, not sure where do we need to store this or if we need to.
      mainService.send({
        type: 'GO.TO.PUBLICATION',
        docId: state.context.documentId,
        version: (
          state as StateFrom<ReturnType<typeof createPublicationMachine>>
        ).context.version,
      })
    }
  }

  return (
    <StyledItem className={listItemStyle()}>
      <a className="title" onClick={goToDocument}>
        {state.context.title || 'Untitled Document'}
      </a>
    </StyledItem>
  )
}
