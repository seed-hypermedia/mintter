import {PublicationActor} from '@app/publication-machine'
import {DiscussionItem} from '@components/discussion-item'
import {useSelector} from '@xstate/react'
import '../styles/discussion.scss'

export type DiscussionProps = {
  fileRef: PublicationActor
}

export function Discussion({fileRef}: DiscussionProps) {
  const items = useSelector(fileRef, (state) => state.context.dedupeLinks)
  return (
    <ul className="discussion-list" data-testid="discussion-list">
      {items.map((link) => (
        <DiscussionItem
          key={`${link.source?.documentId}-${link.source?.version}`}
          link={link}
        />
      ))}
    </ul>
  )
}
