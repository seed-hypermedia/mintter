import {publicationMachine} from '@app/publication-machine'
import {error} from '@app/utils/logger'
import {Box} from '@components/box'
import {DiscussionItem} from '@components/discussion-item'
import {useActor} from '@xstate/react'
import {InterpreterFrom} from 'xstate'

export type DiscussionProps = {
  service: InterpreterFrom<typeof publicationMachine>
}

export function Discussion({service}: DiscussionProps) {
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
