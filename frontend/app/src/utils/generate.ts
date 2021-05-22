import documents from '@mintter/api/documents/v1alpha/documents_pb';
import type accounts from '@mintter/api/accounts/v1alpha/accounts_pb';
import { makeProto } from './make-proto';
import {
  focusBlockStartById,
  normalizeDescendantsToDocumentFragment,
} from '@udecode/slate-plugins';

import faker from 'faker';
import { createId } from './create-id';

export function buildProfile(): accounts.Profile.AsObject {
  return {
    alias: faker.internet.userName(),
    email: faker.internet.email(),
    bio: faker.lorem.paragraph(),
  };
}

export function buildAccount({
  id = createId(),
  profile = buildProfile(),
  devicesMap = buildDevices(),
}: {
  id?: string;
  profile?: accounts.Profile.AsObject;
  devicesMap?: [string, accounts.Device.AsObject][];
} = {}): accounts.Account.AsObject {
  return {
    id,
    profile,
    devicesMap,
  };
}

export function buildDevices(): Array<[string, accounts.Device.AsObject]> {
  return [
    ['1', { peerId: '1' } as accounts.Device.AsObject],
    ['2', { peerId: '2' } as accounts.Device.AsObject],
    ['3', { peerId: '3' } as accounts.Device.AsObject],
  ];
}

export function buildPublication(): documents.Publication {
  let pub = new documents.Publication();

  pub.setDocument(buildDocument());
  pub.setVersion(createId());

  return pub;
}

type BuildDocumentOptions = Partial<documents.Document.AsObject> & {
  blocks?: documents.Block[];
};

export function buildDocument({
  author = faker.finance.bitcoinAddress(),
  blocks,
  childrenListStyle = documents.ListStyle.NONE,
  title = faker.lorem.sentence(),
  subtitle = faker.lorem.sentence(),
  id = createId(),
}: BuildDocumentOptions = {}): documents.Document {
  let block1: documents.Block;
  let block2: documents.Block;
  let block3: documents.Block;
  if (blocks === undefined) {
    block1 = buildBlock();
    block2 = buildBlock();
    block3 = buildBlock();
    blocks = [block1, block2, block3];
  }

  let doc = new documents.Document();
  doc.setId(id);
  doc.setTitle(title);
  doc.setSubtitle(subtitle);
  doc.setAuthor(author);
  doc.setChildrenListStyle(childrenListStyle);
  let blocksMap = doc.getBlocksMap();
  blocks.forEach((b) => {
    blocksMap.set(b.getId(), b);
  });
  let linksMap = doc.getLinksMap();
  // set links map when needed
  return doc;
}

type BuildBlockOptions = Partial<documents.Block.AsObject> & {
  elementsList?: documents.InlineElement[];
};

export function buildBlock({
  elementsList,
  id = createId(),
  childListStyle = documents.ListStyle.NONE,
  parent = '',
  type = documents.Block.Type.BASIC,
  childrenList = [],
}: BuildBlockOptions = {}): documents.Block {
  let inlineElements: documents.InlineElement[];
  if (elementsList === undefined) {
    elementsList = [
      buildTextInlineElement(),
      buildTextInlineElement(),
      buildTextInlineElement(),
    ];
  } else {
    elementsList.map((n) => buildTextInlineElement(n.textRun));
  }

  let block = new documents.Block();
  block.setId(id);
  block.setElementsList(elementsList as documents.InlineElement[]);
  block.setChildListStyle(childListStyle);
  block.setParent(parent);
  block.setChildrenList(childrenList);
  block.setType(type);

  return block;
}

export function buildTextInlineElement(
  textRun?: documents.TextRun.AsObject,
): documents.InlineElement {
  if (textRun === undefined) {
    textRun = {
      text: faker.lorem.sentence(),
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      code: false,
      linkKey: '',
      blockquote: false,
    };
  }

  let node = new documents.InlineElement();
  let text = makeProto<documents.TextRun, documents.TextRun.AsObject>(
    new documents.TextRun(),
    textRun,
  );

  node.setTextRun(text);

  return node;
}
