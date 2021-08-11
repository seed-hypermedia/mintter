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
import {
  document,
  statement,
  paragraph,
  text,
  group,
  heading,
  staticParagraph,
  ul,
  code,
  blockquote,
  embed,
  ol,
  link,
} from '@mintter/mttast-builder'

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
    group([
      statement({id: nanoid(8)}, [paragraph([text(`hello world. I'm the content of a normal statement`)])]),
      heading({id: nanoid(8)}, [
        staticParagraph([text('Heading + orderedList + nesting')]),
        ol([
          statement({id: nanoid(8)}, [paragraph([text('Child 1')])]),
          statement({id: nanoid(8)}, [
            paragraph([text('Child 2')]),
            ul([
              statement({id: nanoid(8)}, [paragraph([text('Nested child 1')])]),
              statement({id: nanoid(8)}, [paragraph([text('Nested child 2')])]),
            ]),
          ]),
          statement({id: nanoid(8)}, [paragraph([text('Child 3')])]),
        ]),
      ]),
      heading({id: nanoid(8)}, [
        staticParagraph([text('Heading 2')]),
        group([
          heading({id: nanoid(8)}, [
            staticParagraph([text('Heading 3')]),
            group([
              heading({id: nanoid(8)}, [
                staticParagraph([text('Heading 4')]),
                group([
                  heading({id: nanoid(8)}, [
                    staticParagraph([text('Heading 5')]),
                    group([heading({id: nanoid(8)}, [staticParagraph([text('Heading 6')])])]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
      heading({id: nanoid(8)}, [
        staticParagraph([text('Inline Elements')]),
        group([
          statement({id: nanoid(8)}, [
            paragraph([
              text('Inline Elements', {strong: true}),
              text(' are a '),
              text('simple', {strikethrough: true}),
              text(' '),
              text('crucial part', {underline: true}),
              text(' of our '),
              text('Document Model', {strong: true, emphasis: true}),
              text('. They can only live inside any '),
              text('FlowContent', {emphasis: true}),
              text('1', {superscript: true}),
              text(' node'),
              text('a', {subscript: true}),
              text('.'),
            ]),
          ]),
        ]),
      ]),
      heading({id: nanoid(8)}, [
        staticParagraph([text('Links and Embeds')]),
        group([
          statement({id: nanoid(8)}, [
            paragraph([
              text('We can also represent '),
              link({url: 'https://mintter.com'}, [text('external web links')]),
              text(', and also embeds (mintter links): '),
              embed({url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [
                text('another embed content '),
                text('with ', {strong: true}),
                text('formatting.', {emphasis: true}),
              ]),
            ]),
          ]),
        ]),
      ]),
      heading({id: nanoid(8)}, [
        staticParagraph([text(`Code blocks and Blockquotes`)]),
        group([
          code({id: nanoid(8), lang: 'javascript', meta: null}, [
            text(`function greeting(name) {
        console.log("Hello " + name + "!");
      }

      greeting('Horacio');`),
          ]),
          blockquote({id: nanoid(8)}, [paragraph([text('History doesn’t repeat itself. But it does rhyme.')])]),
          blockquote({id: nanoid(8)}, [
            paragraph([
              embed({url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [
                text('this is the content of an embed inside a blockquote'),
              ]),
            ]),
          ]),
        ]),
      ]),
      // heading([
      //   staticParagraph([text('Video and Images')]),
      //   group([
      //     statement([paragraph([video({url: 'https://www.youtube.com/watch?v=NTfPtYJORck'}, [text('')])])]),
      //     statement([
      //       paragraph([
      //         image(
      //           {
      //             url: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=3451&q=80',
      //           },
      //           [text('')],
      //         ),
      //       ]),
      //     ]),
      //   ]),
      // ]),
    ]),
  ],
)
