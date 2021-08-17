import {useQueryClient, useMutation} from 'react-query'
import {useMemo, useEffect, Dispatch} from 'react'
import {EditorAction, EditorState, useEditorReducer} from './editor-reducer'
import {Document, publishDraft, updateDraft} from '@mintter/client'
import {useDraft} from '@mintter/client/hooks'
import {useStoreEditorValue} from '@udecode/slate-plugins'
import {toEditorValue} from './to-editor-value'
import {toDocument} from './to-document'

type UseEditorValue = {
  value: EditorState
  send: Dispatch<EditorAction>
  save: (d: Document) => Promise<Document>
  publish: () => Promise<void>
}

export function useEditorDraft(documentId: string): UseQueryResult<UseEditorValue> {
  // set local state
  /**
   * need to do:
   * - fetch draft
   * - convert draft into editor value
   * - effect to autosave draft
   * need to return:
   * - editor value
   * - publish function
   */
  const queryClient = useQueryClient()
  const draftQuery = useDraft(documentId)
  const [value, send] = useEditorReducer()
  const currentEditorValue = useStoreEditorValue('editor')
  const document = useMemo(() => draftQuery.data, [draftQuery.data])

  useEffect(() => {
    if (draftQuery.isSuccess && draftQuery.data) {
      const {title, subtitle} = draftQuery.data
      send({
        type: 'full',
        payload: {
          title,
          subtitle,
          blocks: toEditorValue(draftQuery.data),
        },
      })
    }
  }, [draftQuery.data])

  const {mutateAsync: save} = useMutation(
    async () => {
      const {id, author} = document
      const {title, subtitle} = value
      const newDoc = toDocument({
        id,
        author,
        title,
        subtitle,
        blocks: currentEditorValue,
      })
      return await updateDraft(newDoc)
    },
    {
      onMutate: async () => {
        await queryClient.cancelQueries(['Draft', document?.id])
        await queryClient.invalidateQueries('DraftList')

        const previousDraft = queryClient.getQueryData<Document>(['Draft', document?.id])

        const newDraft = toDocument({
          id: document.id,
          title: value.title,
          subtitle: value.subtitle,
          author: document.author,
          blocks: currentEditorValue,
        })

        if (previousDraft) {
          queryClient.setQueryData<Document>(['Draft', document?.id], newDraft)
        }

        return {previousDraft, newDraft}
      },
    },
  )

  const {mutateAsync: publish} = useMutation(async () => {
    await save()
    return await publishDraft(document?.id)
  })

  useEffect(() => {
    // save before closing the page
    return () => {
      save()
    }
  }, [])

  return {
    ...draftQuery,
    data: {
      value,
      send,
      save,
      publish,
    },
  }
}
