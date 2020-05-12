import {useEffect} from 'react'
import {Node} from 'slate'
import {useQuery, useMutation, queryCache, usePaginatedQuery} from 'react-query'
import {makeRpcDocumentsClient} from './rpc'
import {
  ListDraftsRequest,
  CreateDraftRequest,
  GetDraftRequest,
  Draft,
} from '@mintter/proto/documents_pb'
import {useDebounce} from './hooks'
import {fromSlateToMarkdown} from './parseToMarkdown'

const rpc = makeRpcDocumentsClient()

export function useDraftsList(page = 0) {
  return usePaginatedQuery(['DraftsList', page], async (key, page) => {
    const req = new ListDraftsRequest()
    req.setPageSize(page)

    return await rpc.listDrafts(req)
  })
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
  const {title, description, value} = values

  const request = new Draft()

  request.setDocumentId(documentId)
  title && request.setTitle(title)
  description && request.setDescription(description)

  if (value.length > 0) {
    // console.log('fromSlateToMarkdown => ', fromSlateToMarkdown(value))
    request.setSectionsList(fromSlateToMarkdown(value))
  }
  const resp = await rpc.saveDraft(request)
  console.log('saveDraft -> resp', resp)
  console.log('saveDraft -> resp.toObject', resp.toObject())
}

export async function useFetchDraft(documentId: string) {
  return useQuery(documentId && ['Draft', documentId], async (key, id) => {
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
    mutateDraft({
      documentId,
      values: {
        title: debouncedTitle,
        description: debouncedDescription,
        value: debouncedValue,
      },
    })
  }, [debouncedTitle, debouncedDescription, debouncedValue])
}
