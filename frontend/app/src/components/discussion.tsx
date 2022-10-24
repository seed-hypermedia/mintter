import '../styles/discussion.scss'

import {useDiscussion} from '@app/hooks'
import {DiscussionItem} from '@components/discussion-item'
import {appWindow} from '@tauri-apps/api/window'
import {useEffect} from 'react'

export type DiscussionProps = {
  documentId?: string
  version?: string
  visible: boolean
}

export function Discussion({documentId, visible = false}: DiscussionProps) {
  const {data, refetch} = useDiscussion({documentId, visible})

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    appWindow
      .onFocusChanged(({payload: focused}) => {
        if (!isSubscribed) {
          return unlisten()
        }

        if (focused) {
          refetch()
        }
        console.log('Focus changed, window is focused? ' + focused)
      })
      .then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  return (
    <div className="discussions-wrapper">
      <ul className="discussion-list" data-testid="discussion-list">
        {data &&
          data.map((link) => (
            <DiscussionItem
              key={`${link.source?.documentId}-${link.source?.version}`}
              link={link}
            />
          ))}
      </ul>
    </div>
  )
}
