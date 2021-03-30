import documents from '@mintter/api/documents/v1alpha/documents_pb';
import mintter from '@mintter/api/v2/mintter_pb';
import { id as getId } from '@mintter/editor/id';
import { makeProto } from '@mintter/editor/transformers/make-proto';

import faker from 'faker';

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

export function buildBlocksMap(
  blocks: documents.Block[],
): Array<[string, Block.AsObject]> {
  return blocks.map((b) => {
    let block = b.toObject();

    return [block.id, block];
  });
}

export function buildChildrensList(blocks: documents.Block[]): string[] {
  return blocks.map((b) => b.getId());
}

export function buildDocument({
  author = faker.finance.bitcoinAddress(),
  blocks,
  childrenListStyle = documents.ListStyle.NONE,
  title = faker.lorem.sentence(),
  subtitle = faker.lorem.sentence(),
  id = getId(),
  linksMap = [],
}: Partial<documents.Document.AsObject> & {
  blocks: documents.Block[];
}): documents.Document.AsObject {
  let block1: documents.Block;
  let block2: documents.Block;
  let block3: documents.Block;
  if (blocks === undefined) {
    block1 = buildBlock();
    block2 = buildBlock();
    block3 = buildBlock();
    blocks = [block1, block2, block3];
  }

  return {
    id,
    title,
    subtitle,
    author,
    childrenListStyle,
    childrenList: buildChildrensList(blocks),
    blocksMap: buildBlocksMap(blocks),
    linksMap,
  };
}

export function buildBlock({
  elementsList,
  id = getId(),
  childListStyle = documents.ListStyle.NONE,
  parent,
  type = documents.Block.Type.BASIC,
  childrenList = [],
}: Partial<documents.Block.AsObject>): documents.Block {
  let inlineElements: documents.InlineElement[];
  if (elementsList === undefined) {
    elementsList = [
      buildTextInlineElement().toObject(),
      buildTextInlineElement().toObject(),
      buildTextInlineElement().toObject(),
    ];
  }

  let block = new documents.Block();
  block.setId(id);
  block.setElementsList(elementsList);
  block.setChildListStyle(childListStyle);
  block.setParent(parent);
  block.setChildrenList(childrenList);
  block.setType(type);

  return block;
}

export function buildTextInlineElement(
  elm?: documents.InlineElement.AsObject,
): documents.InlineElement {
  if (elm === undefined) {
    elm = {
      textRun: faker.lorem.sentence(),
    };
  }
  let element = makeProto(
    new documents.InlineElement(),
    elm as documents.InlineElement.AsObject,
  );
}

export function buildImageInlineElement(
  elm?: documents.InlineElement.AsObject,
  linkKey: string,
): documents.InlineElement {
  if (elm === undefined) {
    elm = {
      image: {
        altText: faker.lorem.sentence(),
        linkKey,
      },
    };
  }
  let element = makeProto(
    new documents.InlineElement(),
    elm as documents.InlineElement.AsObject,
  );
}

export function buildQuoteInlineElement(
  elm?: documents.InlineElement.AsObject,
  linkKey: string,
): documents.InlineElement {
  if (elm === undefined) {
    elm = {
      quote: {
        linkKey,
        startOffset: 0,
        endOffset: 0,
      },
    };
  }
  let element = makeProto(
    new documents.InlineElement(),
    elm as documents.InlineElement.AsObject,
  );
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
