import faker from 'faker';
// import { identity } from 'lodash';

import * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import * as mintter from '@mintter/api/v2/mintter_pb';
import { id as getId } from '@mintter/editor/id';

export function buildProfile(): mintter.Profile.AsObject {
  return {
    peerId: faker.finance.bitcoinAddress(),
    accountId: faker.finance.bitcoinAddress(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    bio: faker.lorem.paragraph(),
    connectionStatus: mintter.ConnectionStatus.CONNECTED,
  };
}

export function buildDocument({
  author = faker.finance.bitcoinAddress(),
} = {}): documents.Document.AsObject {
  const block = buildBlock();

  return {
    id: faker.finance.bitcoinAddress(),
    title: faker.lorem.sentence(),
    subtitle: faker.lorem.sentence(),
    author,
    childrenListStyle: documents.ListStyle.NONE,
    childrenList: [block.id],
    blocksMap: [[block.id, block]],
    linksMap: [],
  };
}

export function buildBlock(id = getId()): documents.Block.AsObject {
  const textRun: documents.InlineElement.AsObject = {
    textRun: {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      code: false,
      blockquote: false,
      linkKey: '',
      text: 'Hello world',
    },
  };
  return {
    id,
    parent: '',
    type: documents.Block.Type.BASIC,
    childListStyle: documents.ListStyle.NONE,
    elementsList: [textRun],
    childrenList: [],
  };
}

// export function buildGetDocument({
//   author = faker.finance.bitcoinAddress(),
//   publishingState = PublishingState.PUBLISHED,
//   quotersList = [],
// } = {}): GetDocumentResponse.AsObject {
//   const blockRefList = bluidBlockRefList();
//   const blocksMap: [string, Block.AsObject][] = [
//     [
//       blockRefList.refsList[0].ref,
//       {
//         id: blockRefList.refsList[0].ref,
//         paragraph: {
//           inlineElementsList: [
//             {
//               text: faker.lorem.sentence(),
//             },
//           ],
//         },
//         quotersList,
//       },
//     ],
//   ];

//   return {
//     document: buildDocument({ blockRefList, author, publishingState }),
//     blocksMap,
//   };
// }

// export function bluidBlockRefList(): BlockRefList.AsObject {
//   return {
//     style: BlockRefList.Style.NONE,
//     refsList: [
//       {
//         ref: faker.random.uuid(),
//       },
//     ],
//   };
// }

// export function buildSuggestedConnection(): SuggestedProfile.AsObject {
//   return {
//     profile: buildProfile(),
//     addrsList: buildAddrsList(),
//   };
// }

// export function buildAddrsList(): string[] {
//   return [faker.internet.ip(), faker.internet.ip(), faker.internet.ip()];
// }

// export function buildDraft({
//   author = faker.finance.bitcoinAddress(),
//   publishingState = PublishingState.DRAFT,
//   blockRefList = bluidBlockRefList(),
// } = {}) {
//   return buildDocument({ author, publishingState, blockRefList });
// }

// export function buildEditProfile(): Pick<
//   Profile.AsObject,
//   'username' | 'bio' | 'email'
// > {
//   return {
//     username: faker.internet.userName(),
//     email: faker.internet.email(),
//     bio: faker.lorem.paragraph(),
//   };
// }
