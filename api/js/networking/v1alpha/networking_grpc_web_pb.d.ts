import * as grpcWeb from 'grpc-web';

import {
  GetPeerAddrsRequest,
  GetPeerAddrsResponse,
  StartAccountDiscoveryRequest,
  StartAccountDiscoveryResponse} from './networking_pb';

export class NetworkingClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  startAccountDiscovery(
    request: StartAccountDiscoveryRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: StartAccountDiscoveryResponse) => void
  ): grpcWeb.ClientReadableStream<StartAccountDiscoveryResponse>;

  getPeerAddrs(
    request: GetPeerAddrsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GetPeerAddrsResponse) => void
  ): grpcWeb.ClientReadableStream<GetPeerAddrsResponse>;

}

export class NetworkingPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  startAccountDiscovery(
    request: StartAccountDiscoveryRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<StartAccountDiscoveryResponse>;

  getPeerAddrs(
    request: GetPeerAddrsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GetPeerAddrsResponse>;

}

