import * as grpcWeb from 'grpc-web';

import {
  DialPeerRequest,
  DialPeerResponse,
  GenSeedRequest,
  GenSeedResponse,
  RegisterRequest,
  RegisterResponse} from './daemon_pb';

export class DaemonClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  genSeed(
    request: GenSeedRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GenSeedResponse) => void
  ): grpcWeb.ClientReadableStream<GenSeedResponse>;

  register(
    request: RegisterRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: RegisterResponse) => void
  ): grpcWeb.ClientReadableStream<RegisterResponse>;

  dialPeer(
    request: DialPeerRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: DialPeerResponse) => void
  ): grpcWeb.ClientReadableStream<DialPeerResponse>;

}

export class DaemonPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  genSeed(
    request: GenSeedRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GenSeedResponse>;

  register(
    request: RegisterRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<RegisterResponse>;

  dialPeer(
    request: DialPeerRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<DialPeerResponse>;

}

