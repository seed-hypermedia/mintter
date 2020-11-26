import {
  BlockRefList,
  Document,
  PublishingState,
} from '@mintter/api/v2/documents_pb'
import {
  ConnectionStatus,
  Profile,
  SuggestedProfile,
} from '@mintter/api/v2/mintter_pb'
import * as faker from 'faker'

export function buildUser(): Profile.AsObject {
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
}): Document.AsObject {
  return {
    id: faker.finance.bitcoinAddress(),
    version: faker.finance.bitcoinAddress(),
    title: faker.random.words(),
    subtitle: faker.random.words(),
    author,
    parent: '',
    publishingState,
    blockRefList: bluidBlockRefList(),
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
    profile: buildUser(),
    addrsList: buildAddrsList(),
  }
}

export function buildAddrsList(): string[] {
  return [faker.internet.ip(), faker.internet.ip(), faker.internet.ip()]
}
