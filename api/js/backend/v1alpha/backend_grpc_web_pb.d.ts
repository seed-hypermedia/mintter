import * as grpcWeb from 'grpc-web';

import {
  BindAccountRequest,
  BindAccountResponse,
  DialPeerRequest,
  DialPeerResponse,
  GenSeedRequest,
  GenSeedResponse} from './backend_pb';

export class BackendClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  genSeed(
    request: GenSeedRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GenSeedResponse) => void
  ): grpcWeb.ClientReadableStream<GenSeedResponse>;

  bindAccount(
    request: BindAccountRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: BindAccountResponse) => void
  ): grpcWeb.ClientReadableStream<BindAccountResponse>;

  dialPeer(
    request: DialPeerRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: DialPeerResponse) => void
  ): grpcWeb.ClientReadableStream<DialPeerResponse>;

}

export class BackendPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  genSeed(
    request: GenSeedRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GenSeedResponse>;

  bindAccount(
    request: BindAccountRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<BindAccountResponse>;

  dialPeer(
    request: DialPeerRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<DialPeerResponse>;

}

