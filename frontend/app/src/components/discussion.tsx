import {mainService as defaultMainService} from '@app/app-providers'
import {createPublicationMachine} from '@app/publication-machine'
import {error} from '@app/utils/logger'
import {Box} from '@components/box'
import {DiscussionItem} from '@components/discussion-item'
import {useActor} from '@xstate/react'
import {ActorRefFrom} from 'xstate'

export type DiscussionProps = {
  service: ActorRefFrom<ReturnType<typeof createPublicationMachine>>
  mainService?: typeof defaultMainService
}

export function Discussion({service, mainService}: DiscussionProps) {
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
          width: '$full',
          flexDirection: 'column',
          gap: '$4',
          paddingHorizontal: '$4',
        }}
      >
        {state.context.dedupeLinks.map((link) => {
          let {source} = link
          let key = `link-${source?.documentId}-${source?.version}-${source?.blockId}`
          return (
            <DiscussionItem key={key} link={link} mainService={mainService} />
          )
        })}
      </Box>
    )
  }

  return null
}
