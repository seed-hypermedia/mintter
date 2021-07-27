import {u} from '@mintter/client'
import {nanoid} from 'nanoid'
import {useQuery} from 'react-query'
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

  const draftQuery = useQuery(['Draft', documentId], async ({queryKey}) => {
    const [_key, draftId] = queryKey
    const draft = u('root', {title: '', subtitle: ''}, [u('group', [u('statement', {id: nanoid()}, [u('text', '')])])])

    return draft
  })

  return {
    ...draftQuery,
    data: {
      value: draftQuery.data,
      send: (event) => {
        console.log('event: ', event)
      },
    },
  }
}
