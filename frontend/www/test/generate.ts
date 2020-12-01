import {
  Block,
  BlockRefList,
  Document,
  GetDocumentResponse,
  PublishingState,
} from '@mintter/api/v2/documents_pb'
import {
  ConnectionStatus,
  Profile,
  SuggestedProfile,
} from '@mintter/api/v2/mintter_pb'
import * as faker from 'faker'

export function buildProfile(): Profile.AsObject {
  return {
    accountId: faker.finance.bitcoinAddress(),
    peerId: faker.finance.bitcoinAddress(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    bio: faker.lorem.paragraph(),
    connectionStatus: ConnectionStatus.CONNECTED,
  }
}

export function buildDocument({
  author = faker.finance.bitcoinAddress(),
  publishingState = PublishingState.PUBLISHED,
  blockRefList = bluidBlockRefList(),
} = {}): Document.AsObject {
  return {
    id: faker.finance.bitcoinAddress(),
    version: faker.finance.bitcoinAddress(),
    title: faker.lorem.sentence(),
    subtitle: faker.lorem.sentence(),
    author,
    parent: '',
    publishingState,
    blockRefList,
  }
}

export function buildGetDocument({
  author = faker.finance.bitcoinAddress(),
  publishingState = PublishingState.PUBLISHED,
} = {}): GetDocumentResponse.AsObject {
  const blockRefList = bluidBlockRefList()
  const blocksMap: [string, Block.AsObject][] = [
    [
      blockRefList.refsList[0].ref,
      {
        id: blockRefList.refsList[0].ref,
        paragraph: {
          inlineElementsList: [
            {
              text: faker.lorem.sentence(),
            },
          ],
        },
        quotersList: [],
      },
    ],
  ]

  return {
    document: buildDocument({blockRefList, author, publishingState}),
    blocksMap,
  }
}

export function bluidBlockRefList(): BlockRefList.AsObject {
  return {
    style: BlockRefList.Style.NONE,
    refsList: [
      {
        ref: faker.random.uuid(),
      },
    ],
  }
}

export function buildSuggestedConnection(): SuggestedProfile.AsObject {
  return {
    profile: buildProfile(),
    addrsList: buildAddrsList(),
  }
}

export function buildAddrsList(): string[] {
  return [faker.internet.ip(), faker.internet.ip(), faker.internet.ip()]
}
