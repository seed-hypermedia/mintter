import {createPublicationMachine} from '@app/publication-machine'
import {error} from '@app/utils/logger'
import {Box} from '@components/box'
import {DiscussionItem} from '@components/discussion-item'
import {useActor} from '@xstate/react'
import {ActorRefFrom} from 'xstate'

export type DiscussionProps = {
  service: ActorRefFrom<ReturnType<typeof createPublicationMachine>>
}

export function Discussion({service}: DiscussionProps) {
  const [state] = useActor(service)

  if (state.matches('discussion.fetching')) {
    return <span>loading discussion...</span>
  }

  if (state.matches('discussion.errored')) {
    error('Discussion Error')
    return <span>Discussion ERROR</span>
  }

  if (state.matches('discussion.ready.visible')) {
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
