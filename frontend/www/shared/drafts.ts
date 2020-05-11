import {useState, useEffect, useCallback} from 'react'
import {Node} from 'slate'
import {useQuery, useMutation, queryCache} from 'react-query'
import {makeRpcDocumentsClient} from './rpc'
import {
  ListDraftsRequest,
  CreateDraftRequest,
  GetDraftRequest,
  Draft,
} from '@mintter/proto/documents_pb'
import {useDebounce} from './hooks'

const rpc = makeRpcDocumentsClient()

export function useDrafts() {
  const {status, data, error} = useQuery('DraftsList', async () => {
    const req = new ListDraftsRequest()
    try {
      const response = await rpc.listDrafts(req)
      return {
        raw: response,
        results: response.toObject(),
      }
    } catch (err) {
      console.error('Error on useDrafts -> ', err)
      throw err
    }
  })

  return {
    drafts: data,
    draftsError: error,
    loading: status === 'loading',
  }
}

export async function createDraft(cb) {
  const req = new CreateDraftRequest()
  try {
    const resp = await rpc.createDraft(req)
    cb(resp)
  } catch (err) {
    console.error('Error on createDraft -> ', err)
    throw err
  }
}

export async function saveDraft({documentId, values}) {
  const {title, description} = values
  console.log('saveDraft -> values', values)
  const request = new Draft()

  request.setDocumentId(documentId)
  title && request.setTitle(title)
  description && request.setDescription(description)

  const resp = await rpc.saveDraft(request)
  console.log('saveDraft -> resp', resp.toObject())
}

export function useFetchDraft(documentId: string | string[]) {
  // TODO: do I need this for TS to not complain?? 🤷‍♂️
  const value = Array.isArray(documentId) ? documentId.join('') : documentId
  return useQuery(documentId && ['Draft', value], async (key, id) => {
    const request = new GetDraftRequest()
    request.setDocumentId(id)
    return await rpc.getDraft(request)
  })
}

export function useDraftAutosave(
  documentId: string | string[],
  title: string,
  description: string,
  value: Node[],
) {
  const [mutateDraft] = useMutation(saveDraft, {
    onSuccess: () => {
      queryCache.refetchQueries('Draft')
    },
  })
  // get draft id, title, description and  sections (slate values)
  // transform sections
  // save to draft
  // throttle save listener

  // debounce auto-save values
  const debounceDelay = 1000
  const debouncedTitle = useDebounce<string>(title, debounceDelay)
  const debouncedDescription = useDebounce<string>(description, debounceDelay)
  const debouncedValue = useDebounce<Node[]>(value, debounceDelay)

  useEffect(() => {
    console.log('MUTATE')
    mutateDraft({
      documentId,
      values: {
        title: debouncedTitle,
        description: debouncedDescription,
      },
    })
  }, [debouncedTitle, debouncedDescription, debouncedValue])
}
