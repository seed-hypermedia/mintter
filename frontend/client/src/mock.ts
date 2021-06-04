import { Profile, Device, Account } from '@mintter/api/accounts/v1alpha/accounts'
import {
  Publication,
  Block,
  ListStyle,
  Document,
  InlineElement,
  Block_Type,
  TextRun,
} from '@mintter/api/documents/v1alpha/documents'
import faker from 'faker'
import { nanoid } from 'nanoid'

export const createId = (length: number = 8) => nanoid(length)

export function mockProfile(): Profile {
  return {
    alias: faker.internet.userName(),
    email: faker.internet.email(),
    bio: faker.lorem.paragraph(),
  }
}

export function mockAccount({
  id = createId(),
  profile = mockProfile(),
  devices = mockDevices(),
}: {
  id?: string
  profile?: Profile
  devices?: Record<string, Device>
} = {}): Account {
  return Account.fromPartial({
    id,
    profile,
    devices,
  })
}

export function mockDevices(): Record<string, Device> {
  return {
    '1': Device.fromPartial({ peerId: '1' }),
    '2': Device.fromPartial({ peerId: '2' }),
    '3': Device.fromPartial({ peerId: '3' }),
  }
}

export function mockPublication(): Publication {
  return Publication.fromPartial({
    document: mockDocument(),
    version: createId(),
  })
}

export function mockDocument({
  author = faker.finance.bitcoinAddress(),
  blocks,
  childrenListStyle = ListStyle.NONE,
  title = faker.lorem.sentence(),
  subtitle = faker.lorem.sentence(),
  id = createId(),
}: Omit<Partial<Document>, 'blocks'> & { blocks?: Block[] } = {}): Document {
  const blockMap = Object.fromEntries(
    (blocks || [mockBlock(), mockBlock(), mockBlock()])
      .map(block => [block.id, block])
  )

  return Document.fromPartial({
    id,
    title,
    subtitle,
    author,
    childrenListStyle,
    blocks: blockMap,
    children: Object.values(blockMap).map(b => b.id)
  });
}

type MockBlockOptions = Partial<Block> & {
  elements?: InlineElement[]
}

export function mockBlock({
  elements,
  id = createId(),
  childListStyle = ListStyle.NONE,
  parent = '',
  type = Block_Type.BASIC,
  children = [],
}: MockBlockOptions = {}): Block {
  return Block.fromPartial({
    id,
    elements: elements
      ? elements.map(n => mockTextInlineElement(n.textRun))
      : [
        mockTextInlineElement(),
        mockTextInlineElement(),
        mockTextInlineElement(),
      ],
    childListStyle,
    parent,
    children,
    type,
  })
}

export function mockTextInlineElement(textRun?: TextRun): InlineElement {
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
    },
  })
}
