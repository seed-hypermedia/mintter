import {
  Block,
  CreateDraftRequest,
  DeleteDraftRequest,
  DraftsClientImpl,
  GetDraftRequest,
  InlineElement,
  ListDraftsRequest,
  ListDraftsResponse,
  PublishDraftRequest,
  UpdateDraftRequest,
} from '../.generated/documents/v1alpha/documents'
import type {Document, DocumentView} from '../.generated/documents/v1alpha/documents'
import {createId, mockDocument} from '../mocks'
import {createGrpcClient, GrpcClient} from './grpc-client'
import {u} from 'unist-builder'
import {nanoid} from 'nanoid'
import {document, statement, paragraph, text, group, heading, staticParagraph, ul} from '@mintter/mttast-builder'

/**
 *
 * @param rpc RPC client
 * @returns {Promise<Document>} A promise to the Draft.
 */
export async function createDraft(rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const emptyBlock = Block.fromPartial({id: createId(), elements: [InlineElement.fromPartial({textRun: {text: ''}})]})
  const request = CreateDraftRequest.fromPartial({blocks: [emptyBlock]} as Document)

  return await new DraftsClientImpl(rpc).CreateDraft(request)
}

/**
 *
 * @param draftId
 * @param rpc
 */
export async function deleteDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = DeleteDraftRequest.fromPartial({documentId})
  const response = await new DraftsClientImpl(rpc).DeleteDraft(request)
}

/**
 *
 * @param draft
 * @param rpc
 * @returns
 */
export async function updateDraft(entry: Document, rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  // const request = UpdateDraftRequest.fromPartial({document: entry})
  const response = await new DraftsClientImpl(rpc).UpdateDraft({document: entry})
  return response
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export async function listDrafts(
  pageSize?: number,
  pageToken?: string,
  view?: DocumentView,
  rpc?: GrpcClient,
): Promise<ListDraftsResponse> {
  rpc ||= createGrpcClient()
  const request = ListDraftsRequest.fromPartial({
    pageSize,
    pageToken,
    view,
  })

  return await new DraftsClientImpl(rpc).ListDrafts(request)
}

/**
 *
 * @param documentId
 * @param rpc
 * @returns
 */
export async function publishDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = PublishDraftRequest.fromPartial({documentId})
  return await new DraftsClientImpl(rpc).PublishDraft(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDraft(documentId: string, rpc?: GrpcClient): Promise<Document> {
  // rpc ||= createGrpcClient()
  // const request = GetDraftRequest.fromPartial({documentId})
  // return await new DraftsClientImpl(rpc).GetDraft(request)

  // return await Promise.resolve(document([statement([paragraph([text('hello world')])])]))

  // return await Promise.resolve(
  //   document([
  //     statement([paragraph([text('hello world')]), group([statement([paragraph([text('hello nested statement')])])])]),
  //   ]),
  // )

  // return await Promise.resolve(document([statement([paragraph([text('')])])]))

  return await Promise.resolve(
    document([
      group([
        statement([paragraph([text('first '), text('item in bold', {strong: true})])]),
        heading([
          staticParagraph([text('heading text')]),
          ul([
            statement([paragraph([text('item 1', {emphasis: true, underline: true})])]),
            statement([paragraph([text('item 2', {strikethrough: true}), text('superscript', {superscript: true})])]),
            statement([paragraph([text('item 3'), text('subscript', {subscript: true})])]),
          ]),
        ]),
      ]),
    ]),
  )

  // return await Promise.reject({message: 'testing error'})
}
