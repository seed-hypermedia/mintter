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

  // return await Promise.resolve(
  //   document([
  //     group([
  //       statement([paragraph([text('first item')])]),
  //       heading([
  //         staticParagraph([text('heading text')]),
  //         ul([
  //           statement([paragraph([text('item 1')])]),
  //           statement([paragraph([text('item 2')])]),
  //           statement([paragraph([text('item 3')])]),
  //         ]),
  //       ]),
  //     ]),
  //   ]),
  // )

  // return await Promise.reject({message: 'testing error'})

  return await Promise.resolve(allNodes)
}

var allNodes = u(
  'root',
  {
    id: nanoid(20),
    title: 'Demo Document',
    subtitle: 'demo description',
    createdAt: new Date(),
  },
  [
    u('group', [
      u(
        'statement',
        {
          id: nanoid(8),
        },
        [u('paragraph', [u('text', `hello world. I'm the content of a normal statement`)])],
      ),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Heading + orderedList + nesting`)]),
        u('orderedList', [
          u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'child 1')])]),
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [u('text', 'child 2')]),
            u('orderedList', [
              u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'nested child 2.1')])]),
              u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'nested child 2.2')])]),
            ]),
          ]),
          u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'child 3')])]),
        ]),
      ]),
      u(
        'heading',
        {
          id: nanoid(8),
        },
        [
          u('staticParagraph', [u('text', `A Heading`)]),
          u('orderedList', [
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Headings')])],
            ),
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Lists')])],
            ),
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Images')])],
            ),
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Embeds')])],
            ),
          ]),
        ],
      ),
      u(
        'heading',
        {
          id: nanoid(8),
        },
        [
          u('staticParagraph', [u('text', `Inline Elements`)]),
          u('group', [
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [
                u('paragraph', [
                  u('text', {bold: true}, 'Inline elements'),
                  u('text', ' are a crucial part of our Document model. They can only live inside any '),
                  u('text', {code: true}, 'FlowContent'),
                  u('text', 'node.'),
                ]),
              ],
            ),
          ]),
        ],
      ),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Links and Embeds`)]),
        u('group', [
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [
              u('text', 'We can also represent '),
              u('link', {id: nanoid(8), url: 'https://mintter.com'}, [u('text', 'external web links')]),
              u('text', ', and also embeds (mintter links): '),
              u('embed', {id: nanoid(8), url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [u('text', '')]),
            ]),
          ]),
        ]),
      ]),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Code blocks and Blockquotes`)]),
        u('group', [
          u('code', {id: nanoid(8), lang: 'javascript', meta: null}, [
            u(
              'text',
              `function greeting(name) {
  console.log("Hello " + name + "!");
}

greeting('Horacio');`,
            ),
          ]),
          u('blockquote', {id: nanoid(8)}, [
            u('paragraph', [u('text', 'History doesn’t repeat itself. But it does rhyme.')]),
          ]),
          u('blockquote', {id: nanoid(8)}, [
            u('paragraph', [u('embed', {id: nanoid(8), url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [u('text', '')])]),
          ]),
        ]),
      ]),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Video and Image`)]),
        u('group', [
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [
              u('video', {id: nanoid(8), url: 'https://www.youtube.com/watch?v=NTfPtYJORck'}, [u('text', '')]),
            ]),
          ]),
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [
              u(
                'image',
                {
                  id: nanoid(8),
                  alt: 'teamwork',
                  url: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=3451&q=80',
                },
                [u('text', '')],
              ),
            ]),
          ]),
        ]),
      ]),
    ]),
  ],
)
