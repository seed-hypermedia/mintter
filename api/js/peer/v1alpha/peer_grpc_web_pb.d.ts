import * as grpcWeb from 'grpc-web';

import {
  GetObjectVersionRequest,
  HandshakeInfo,
  PingRequest,
  PingResponse,
  Version} from './peer_pb';

export class PeerClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  handshake(
    request: HandshakeInfo,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: HandshakeInfo) => void
  ): grpcWeb.ClientReadableStream<HandshakeInfo>;

  ping(
    request: PingRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: PingResponse) => void
  ): grpcWeb.ClientReadableStream<PingResponse>;

  getObjectVersion(
    request: GetObjectVersionRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Version) => void
  ): grpcWeb.ClientReadableStream<Version>;

}

export class PeerPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  handshake(
    request: HandshakeInfo,
    metadata?: grpcWeb.Metadata
  ): Promise<HandshakeInfo>;

  ping(
    request: PingRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<PingResponse>;

  getObjectVersion(
    request: GetObjectVersionRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Version>;

}

