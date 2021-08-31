import {
  CreateDraftRequest,
  DeleteDraftRequest,
  DraftsClientImpl,
  GetDraftRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  PublishDraftRequest,
  UpdateDraftRequest,
} from '../.generated/documents/v1alpha/documents'
import type {Document} from '../.generated/documents/v1alpha/documents'
import {createGrpcClient} from './grpc-client'
import type {GrpcClient} from './grpc-client'
import {code, createId, document, embed, group, ol, paragraph, statement, text} from '@mintter/mttast-builder'

/**
 *
 * @param rpc RPC client
 * @returns {Promise<Document>} A promise to the Draft.
 */
export async function createDraft(rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()

  const request = CreateDraftRequest.fromPartial({})
  return await new DraftsClientImpl(rpc).createDraft(request)
}

/**
 *
 * @param draftId
 * @param rpc
 */
export function deleteDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = DeleteDraftRequest.fromPartial({documentId})
  return new DraftsClientImpl(rpc).deleteDraft(request)
}

/**
 *
 * @param draft
 * @param rpc
 * @returns
 */
export function updateDraft(entry: Document, rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const request = UpdateDraftRequest.fromPartial({document: entry})
  return new DraftsClientImpl(rpc).updateDraft({document: entry})
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param view
 * @param rpc
 * @returns
 */
export function listDrafts(
  pageSize?: number,
  pageToken?: string,
  view?: any,
  rpc?: GrpcClient,
): Promise<ListDraftsResponse> {
  rpc ||= createGrpcClient()
  const request = ListDraftsRequest.fromPartial({
    pageSize,
    pageToken,
  })

  return new DraftsClientImpl(rpc).listDrafts(request)
}

/**
 *
 * @param documentId
 * @param rpc
 * @returns
 */
export function publishDraft(documentId: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()
  const request = PublishDraftRequest.fromPartial({documentId})
  return new DraftsClientImpl(rpc).publishDraft(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getDraft(documentId: string, rpc?: GrpcClient): Promise<Document> {
  rpc ||= createGrpcClient()
  const request = GetDraftRequest.fromPartial({documentId})
  const doc = await new DraftsClientImpl(rpc).getDraft(request)
  doc.content = JSON.stringify([
    ol([
      statement({id: createId()}, [
        paragraph([
          text('hello'),
          //     //     embed({url: 'bahfjrj4iasqoiara34x57ubhyfngtcmbgemmxcsmxs3c5hli4dx27l5kn37yggkrmeka/GubuBNmv'}, [text('')]),
        ]),
      ]),

      //     statement({id: createId()}, [paragraph([text('')])]),
      //     code({lang: 'javascript'}, [
      //       paragraph([text(`function decorateCodeElements([node, path]: NodeEntry<Node>) {`)]),
      //       paragraph([text(`  for (const [text, textPath] of Node.texts(node)) {`)]),
      //       paragraph([text(`    const [tokens] = highlighter.codeToThemedTokens(text.value, node.lang)`)]),
      //       paragraph([text(`    console.log('🚀 ~ tokens', tokens)`)]),
      //       paragraph([text(`    let offset = 0`)]),
      //       paragraph([text(`    tokens.forEach((token, i) => {`)]),
      //       paragraph([text(`      if (i != 0) {`)]),
      //       paragraph([text(`        const range: Range & Record<string, unknown> = {`)]),
      //       paragraph([text(`          anchor: {path: [...nodePath, ...textPath], offset},`)]),
      //       paragraph([
      //         text(`          focus: {path: [...nodePath, ...textPath], offset: offset + token.content.length},`),
      //       ]),
      //       paragraph([text(`          data: {`)]),
      //       paragraph([text(`            color: token.color,`)]),
      //       paragraph([text(`          },`)]),
      //       paragraph([text(`        }`)]),
      //       paragraph([text(`        if (token.fontStyle === 1) range[MARK_EMPHASIS] = true`)]),
      //       paragraph([text(`        if (token.fontStyle === 2) range[MARK_STRONG] = true`)]),
      //       paragraph([text(`        if (token.fontStyle === 4) range[MARK_UNDERLINE] = true`)]),
      //       paragraph([text(`        console.log({ranges, range})`)]),
      //       paragraph([text(`        ranges.push(range)`)]),
      //       paragraph([text(`      }`)]),
      //       paragraph([text(`      offset += token.content.length`)]),
      //       paragraph([text(`    })`)]),
      //       paragraph([text(`  }`)]),
      //       paragraph([text(`}`)]),
      //     ]),
    ]),
  ])

  return doc

  // // return await Promise.resolve(document([statement([paragraph([text('hello world')])])]))

  // // return await Promise.reject({message: 'testing error'})

  // return await Promise.resolve(allNodes)
}

// var allNodes = document(
//   {
//     id: nanoid(20),
//     title: 'Demo Document',
//     subtitle: 'demo description',
//     createdAt: new Date(),
//   },
//   [
//     group([
//       // statement({id: nanoid(8)}, [
//       //   paragraph([text('demo statement')]),
//       //   group([
//       //     heading({id: nanoid(8)}, [
//       //       staticParagraph([text('Heading 2')]),
//       //       group([heading({id: nanoid(8)}, [staticParagraph([text('Heading 3')])])]),
//       //     ]),
//       //   ]),
//       // ]),
//       statement({id: nanoid(8)}, [
//         paragraph([text('demo list items')]),
//         ul([
//           statement({id: nanoid(8)}, [paragraph([text('item 1')])]),
//           statement({id: nanoid(8)}, [
//             paragraph([text('item 2')]),
//             ol([
//               statement({id: nanoid(8)}, [paragraph([text('item 2.1')])]),
//               statement({id: nanoid(8)}, [paragraph([text('item 2.2')])]),
//               statement({id: nanoid(8)}, [paragraph([text('item 2.3')])]),
//             ]),
//           ]),
//           statement({id: nanoid(8)}, [paragraph([text('item 3')])]),
//         ]),
//       ]),
//       //       blockquote({id: nanoid(8)}, [paragraph([embed({url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [text('...')])])]),
//       //       statement({id: nanoid(8)}, [paragraph([text(`hello world. I'm the content of a normal statement`)])]),
//       //       heading({id: nanoid(8)}, [
//       //         staticParagraph([text('Inline Elements')]),
//       //         group([
//       //           statement({id: nanoid(8)}, [
//       //             paragraph([
//       //               text('Inline Elements', {strong: true}),
//       //               text(' are a '),
//       //               text('simple', {strikethrough: true}),
//       //               text(' '),
//       //               text('crucial part', {underline: true}),
//       //               text(' of our '),
//       //               text('Document Model', {strong: true, emphasis: true}),
//       //               text('. They can only live inside any '),
//       //               text('FlowContent', {emphasis: true}),
//       //               text('1', {superscript: true}),
//       //               text(' node'),
//       //               text('a', {subscript: true}),
//       //               text('.'),
//       //             ]),
//       //           ]),
//       //         ]),
//       //       ]),
//       //       heading({id: nanoid(8)}, [
//       //         staticParagraph([text('Links and Embeds')]),
//       //         group([
//       //           statement({id: nanoid(8)}, [
//       //             paragraph([
//       //               text('We can also represent '),
//       //               link({url: 'https://mintter.com'}, [text('external web links')]),
//       //               text(', and also embeds (mintter links): '),
//       //               embed({url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [text('...')]),
//       //             ]),
//       //           ]),
//       //         ]),
//       //       ]),
//       //       blockquote({id: nanoid(8)}, [paragraph([embed({url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [text('...')])])]),
//       //       statement({id: nanoid(8)}, [paragraph([text(`hello world. I'm the content of a normal statement`)])]),
//       //       heading({id: nanoid(8)}, [
//       //         staticParagraph([text('Heading + orderedList + nesting')]),
//       //         ol([
//       //           statement({id: nanoid(8)}, [paragraph([text('Child 1')])]),
//       //           statement({id: nanoid(8)}, [
//       //             paragraph([text('Child 2')]),
//       //             ul([
//       //               statement({id: nanoid(8)}, [paragraph([text('Nested child 1')])]),
//       //               statement({id: nanoid(8)}, [paragraph([text('Nested child 2')])]),
//       //             ]),
//       //           ]),
//       //           statement({id: nanoid(8)}, [paragraph([text('Child 3')])]),
//       //         ]),
//       //       ]),

//       //       heading({id: nanoid(8)}, [staticParagraph([text('Heading 1')])]),
//       //       heading({id: nanoid(8)}, [
//       //         staticParagraph([text('Heading 2')]),
//       //         group([
//       //           heading({id: nanoid(8)}, [
//       //             staticParagraph([text('Heading 2.1')]),
//       //             group([
//       //               heading({id: nanoid(8)}, [
//       //                 staticParagraph([text('Heading 2.1.1')]),
//       //                 //     group([
//       //                 //       heading({id: nanoid(8)}, [
//       //                 //         staticParagraph([text('Heading 5')]),
//       //                 //         group([heading({id: nanoid(8)}, [staticParagraph([text('Heading 6')])])]),
//       //                 //       ]),
//       //                 //     ]),
//       //               ]),
//       //             ]),
//       //           ]),
//       //         ]),
//       //       ]),

//       //       heading({id: nanoid(8)}, [
//       //         staticParagraph([text(`Code blocks and Blockquotes`)]),
//       //         group([
//       //           code({id: nanoid(8), lang: 'javascript', meta: null}, [
//       //             text(`function greeting(name) {
//       //   console.log("Hello " + name + "!");
//       // }

//       // greeting('Horacio');`),
//       //           ]),
//       //           blockquote({id: nanoid(8)}, [paragraph([text('History doesn’t repeat itself. But it does rhyme.')])]),
//       //           blockquote({id: nanoid(8)}, [paragraph([embed({url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [text('...')])])]),
//       //         ]),
//       //       ]),

//       // heading([
//       //   staticParagraph([text('Video and Images')]),
//       //   group([
//       //     statement([paragraph([video({url: 'https://www.youtube.com/watch?v=NTfPtYJORck'}, [text('')])])]),
//       //     statement([
//       //       paragraph([
//       //         image(
//       //           {
//       //             url: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=3451&q=80',
//       //           },
//       //           [text('')],
//       //         ),
//       //       ]),
//       //     ]),
//       //   ]),
//       // ]),
//     ]),
//   ],
// )
