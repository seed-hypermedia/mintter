import {Link} from '@app/client'
import {createDiscussionMachine} from '@app/discussion-machine'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {FileProvider} from '@app/file-provider'
import {useQueryClient} from '@tanstack/react-query'
import {useInterpret, useSelector} from '@xstate/react'
import {useMemo} from 'react'
import '../styles/discussion-item.scss'

export function DiscussionItem({link}: {link: Link}) {
  let client = useQueryClient()
  let service = useInterpret(() =>
    createDiscussionMachine({
      client,
      link,
    }),
  )
  let isFetching = useSelector(service, (state) => state.matches('fetching'))
  const editorValue = useSelector(
    service,
    (state) => state.context.source?.document.content,
  )
  const publication = useSelector(service, (state) => state.context.publication)

  const editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Discussion),
    [],
  )

  if (isFetching) {
    return <li>...</li>
  }

  return (
    <li className="discussion-item">
      <div className="item-section item-header"></div>
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
    </li>
  )
}
