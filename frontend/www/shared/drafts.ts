import {useQuery} from 'react-query'
import {makeRpcDocumentsClient} from './rpc'
import {
  ListDraftsRequest,
  CreateDraftRequest,
} from '@mintter/proto/documents_pb'

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
