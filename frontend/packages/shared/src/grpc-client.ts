import {createPromiseClient, PromiseClient} from '@connectrpc/connect'
import {
  Accounts,
  Changes,
  Comments,
  ContentGraph,
  Daemon,
  Documents,
  Drafts,
  Entities,
  Merge,
  Networking,
} from './client'

export type GRPCClient = {
  accounts: PromiseClient<typeof Accounts>
  changes: PromiseClient<typeof Changes>
  comments: PromiseClient<typeof Comments>
  contentGraph: PromiseClient<typeof ContentGraph>
  daemon: PromiseClient<typeof Daemon>
  documents: PromiseClient<typeof Documents>
  drafts: PromiseClient<typeof Drafts>
  entities: PromiseClient<typeof Entities>
  networking: PromiseClient<typeof Networking>
  merge: PromiseClient<typeof Merge>
}

export function createGRPCClient(transport: any): GRPCClient {
  return {
    accounts: createPromiseClient(Accounts, transport),
    changes: createPromiseClient(Changes, transport),
    comments: createPromiseClient(Comments, transport),
    contentGraph: createPromiseClient(ContentGraph, transport),
    daemon: createPromiseClient(Daemon, transport),
    documents: createPromiseClient(Documents, transport),
    drafts: createPromiseClient(Drafts, transport),
    entities: createPromiseClient(Entities, transport),
    networking: createPromiseClient(Networking, transport),
    merge: createPromiseClient(Merge, transport),
  } as const
}
