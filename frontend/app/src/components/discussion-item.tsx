import {MttLink} from '@mintter/shared'
import {createDiscussionMachine} from '@app/discussion-machine'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {FileProvider} from '@app/file-provider'
import {useDiscussion} from '@app/hooks'
import {useMain} from '@app/main-context'
import {formattedDate} from '@app/utils/get-format-date'
import {Avatar} from '@components/avatar'
import {Link} from '@components/router'
import {useQueryClient} from '@tanstack/react-query'
import {useInterpret, useSelector} from '@xstate/react'
import {useMemo} from 'react'
import '../styles/discussion-item.scss'

export function DiscussionItem({link}: {link: MttLink}) {
  let client = useQueryClient()
  let service = useInterpret(() =>
    createDiscussionMachine({
      client,
      link,
    }),
  )
  let isFetching = useSelector(service, (state) => state.matches('fetching'))
  let main = useMain()
  const editorValue = useSelector(
    service,
    (state) => state.context.source?.document.content,
  )
  const publication = useSelector(service, (state) => state.context.publication)
  const author = useSelector(service, (state) => state.context.author)
  const editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Discussion),
    [],
  )

  let {data: discussions} = useDiscussion({
    documentId: publication?.document?.id,
    visible: true,
  })

  if (isFetching) {
    return <li>...</li>
  }

  return (
    <li className="discussion-item">
      <div className="item-section item-avatar">
        <Avatar
          accountId={author?.id}
          size={2}
          alias={author?.profile?.alias || 'A'}
        />
      </div>
      <div className="item-section item-info">
        <p className="alias">{author?.profile?.alias || '...'}</p>
        {publication ? (
          <p className="date">
            {publication.document?.updateTime
              ? formattedDate(publication.document.updateTime)
              : '...'}
          </p>
        ) : null}
      </div>

      <div className="item-section item-content">
        {editorValue ? (
          <FileProvider value={publication}>
            <Editor
              editor={editor}
              value={editorValue}
              mode={EditorMode.Discussion}
            />
          </FileProvider>
        ) : null}
      </div>
      <div className="item-section item-footer">
        {discussions && discussions.length > 0 ? (
          <button
            onClick={() =>
              main.send({
                type: 'COMMIT.OPEN.WINDOW',
                path: `/p/${link.source?.documentId}/${link.source?.version}`,
              })
            }
            className="item-control"
          >
            {discussions?.length == 1
              ? '1 Reply'
              : `${discussions?.length} Replies`}
          </button>
        ) : (
          <Link
            className="item-control"
            href={`/p/${link.source?.documentId}/${link.source?.version}`}
          >
            Jump
          </Link>
        )}
      </div>
    </li>
  )
}
