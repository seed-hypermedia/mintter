import {createPublicationMachine} from '@app/publication-machine'
import {ActorRefFrom} from 'xstate'

export type DiscussionProps = {
  service: ActorRefFrom<ReturnType<typeof createPublicationMachine>>
}

export function Discussion({service}: DiscussionProps) {
  console.log(
    '🚀 ~ file: discussion.tsx ~ line 13 ~ Discussion ~ service',
    service,
  )
  return null
}
