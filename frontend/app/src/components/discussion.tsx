import '../styles/discussion.scss'

import {useAuthor, useDiscussion} from '@app/hooks'
import {ClientPublication} from '@app/publication-machine'
import {formattedDate} from '@app/utils/get-format-date'
import {Avatar} from '@components/avatar'
import {DiscussionItem} from '@components/discussion-item'
import {appWindow} from '@tauri-apps/api/window'
import {useEffect} from 'react'

export type DiscussionProps = {
  publication: ClientPublication
  visible: boolean
}

export function Discussion({publication, visible = false}: DiscussionProps) {
  const {data, refetch} = useDiscussion({
    documentId: publication.document.id,
    visible,
  })

  const {data: author} = useAuthor(publication.document.author)

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
        <li className="discussion-item activity-item">
          <div className="item-section item-avatar">
            {author?.profile?.alias && (
              <Avatar
                accountId={publication.document.author}
                alias={author.profile.alias}
                size={2}
              />
            )}
          </div>
          <div className="item-section item-info">
            {author?.profile?.alias && (
              <p>{author.profile.alias} wrote the original document</p>
            )}
            {publication.document && (
              <p className="date">
                {publication.document.updateTime
                  ? formattedDate(publication.document.updateTime)
                  : '...'}
              </p>
            )}
          </div>
        </li>
        {data &&
          data.map((link) => (
            <DiscussionItem
              key={`${link.source?.documentId}-${link.source?.version}`}
              link={link}
            />
          ))}
        {/* <li className="discussion-item add-item" onClick={() => onReply()}>
          <div className="item-section item-avatar">
            <button className="item-button-add">
              <Icon name="Add" />
            </button>
          </div>
          <div className="item-section item-info">
            <p>
              {data && data.length > 0 ? 'Add a Reply' : 'Start a Discussion'}
            </p>
          </div>
        </li> */}
      </ul>
    </div>
  )
}
