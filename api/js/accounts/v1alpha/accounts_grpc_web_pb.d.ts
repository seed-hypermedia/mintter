import * as grpcWeb from 'grpc-web';

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';

import {
  Account,
  GetAccountRequest,
  ListAccountsRequest,
  ListAccountsResponse,
  Profile,
  StartAccountDiscoveryRequest,
  StartAccountDiscoveryResponse} from './accounts_pb';

export class AccountsClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  getAccount(
    request: GetAccountRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Account) => void
  ): grpcWeb.ClientReadableStream<Account>;

  updateProfile(
    request: Profile,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Account) => void
  ): grpcWeb.ClientReadableStream<Account>;

  listAccounts(
    request: ListAccountsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListAccountsResponse) => void
  ): grpcWeb.ClientReadableStream<ListAccountsResponse>;

  startAccountDiscovery(
    request: StartAccountDiscoveryRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: StartAccountDiscoveryResponse) => void
  ): grpcWeb.ClientReadableStream<StartAccountDiscoveryResponse>;

}

export class AccountsPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  getAccount(
    request: GetAccountRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Account>;

  updateProfile(
    request: Profile,
    metadata?: grpcWeb.Metadata
  ): Promise<Account>;

  listAccounts(
    request: ListAccountsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListAccountsResponse>;

  startAccountDiscovery(
    request: StartAccountDiscoveryRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<StartAccountDiscoveryResponse>;

}

