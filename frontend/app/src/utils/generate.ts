import { Profile, Device, Account } from '@mintter/api/accounts/v1alpha/accounts'
import { Publication, Block, ListStyle, Document, InlineElement, Block_Type, TextRun } from '@mintter/api/documents/v1alpha/documents'

import faker from 'faker';
import { createId } from './create-id';

export function buildProfile(): Profile {
  return {
    alias: faker.internet.userName(),
    email: faker.internet.email(),
    bio: faker.lorem.paragraph(),
  };
}

export function buildAccount({
  id = createId(),
  profile = buildProfile(),
  devices = buildDevices(),
}: {
  id?: string;
  profile?: Profile;
  devices?: Record<string, Device>;
} = {}): Account {
  return Account.fromPartial({
    id,
    profile,
    devices
  })
}

export function buildDevices(): Record<string, Device> {
  return {
    '1': Device.fromPartial({ peerId: '1' }),
    '2': Device.fromPartial({ peerId: '2' }),
    '3': Device.fromPartial({ peerId: '3' })
  }
}

export function buildPublication(): Publication {
  return Publication.fromPartial({
    document: buildDocument(),
    version: createId()
  })
}

export function buildDocument({
  author = faker.finance.bitcoinAddress(),
  blocks,
  childrenListStyle = ListStyle.NONE,
  title = faker.lorem.sentence(),
  subtitle = faker.lorem.sentence(),
  id = createId(),
}: Partial<Document> = {}): Document {
  if (blocks === undefined) {
    const b1 = buildBlock()
    const b2 = buildBlock()
    const b3 = buildBlock()
    blocks = {
      [b1.id]: b1,
      [b2.id]: b2,
      [b3.id]: b3
    }
  }

  return Document.fromPartial({
    id,
    title,
    subtitle,
    author,
    childrenListStyle,
    blocks: blocks,
    children: Object.values(blocks).map(b => b.id)
  });
}

type BuildBlockOptions = Partial<Block> & {
  elementsList?: InlineElement[];
};

export function buildBlock({
  elementsList,
  id = createId(),
  childListStyle = ListStyle.NONE,
  parent = '',
  type = Block_Type.BASIC,
  children = [],
}: BuildBlockOptions = {}): Block {
  return Block.fromPartial({
    id,
    elements: elementsList
      ? elementsList.map(n => buildTextInlineElement(n.textRun))
      : [
        buildTextInlineElement(),
        buildTextInlineElement(),
        buildTextInlineElement(),
      ],
    childListStyle,
    parent,
    children,
    type
  })
}

export function buildTextInlineElement(
  textRun?: TextRun,
): InlineElement {
  return InlineElement.fromPartial({
    textRun: textRun || {
      text: faker.lorem.sentence(),
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      code: false,
      linkKey: '',
      blockquote: false,
    }
  })
}
