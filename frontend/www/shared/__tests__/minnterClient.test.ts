import {DocumentsPromiseClient} from '@mintter/proto/v2/documents_grpc_web_pb'
import {CreateDraftRequest, ListDocumentsRequest} from '@mintter/proto/v2/documents_pb'

test('test v2', async () => {
  const docs = new DocumentsPromiseClient(`http://localhost:55001`)
  console.log('docs', docs)
  // const req = new CreateDraftRequest()
  // const c = docs.createDraft(req).then(c => c.toObject())
  
  const req = new ListDocumentsRequest()
  req.
})
