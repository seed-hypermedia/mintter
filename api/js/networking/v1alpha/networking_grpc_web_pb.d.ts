import * as grpcWeb from 'grpc-web';

import {
  ConnectRequest,
  ConnectResponse,
  GetObjectDiscoveryStatusRequest,
  GetPeerInfoRequest,
  ObjectDiscoveryStatus,
  PeerInfo,
  StartObjectDiscoveryRequest,
  StartObjectDiscoveryResponse,
  StopObjectDiscoveryRequest,
  StopObjectDiscoveryResponse} from './networking_pb';

export class NetworkingClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  startObjectDiscovery(
    request: StartObjectDiscoveryRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: StartObjectDiscoveryResponse) => void
  ): grpcWeb.ClientReadableStream<StartObjectDiscoveryResponse>;

  getObjectDiscoveryStatus(
    request: GetObjectDiscoveryStatusRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ObjectDiscoveryStatus) => void
  ): grpcWeb.ClientReadableStream<ObjectDiscoveryStatus>;

  stopObjectDiscovery(
    request: StopObjectDiscoveryRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: StopObjectDiscoveryResponse) => void
  ): grpcWeb.ClientReadableStream<StopObjectDiscoveryResponse>;

  getPeerInfo(
    request: GetPeerInfoRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: PeerInfo) => void
  ): grpcWeb.ClientReadableStream<PeerInfo>;

  connect(
    request: ConnectRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ConnectResponse) => void
  ): grpcWeb.ClientReadableStream<ConnectResponse>;

}

export class NetworkingPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  startObjectDiscovery(
    request: StartObjectDiscoveryRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<StartObjectDiscoveryResponse>;

  getObjectDiscoveryStatus(
    request: GetObjectDiscoveryStatusRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ObjectDiscoveryStatus>;

  stopObjectDiscovery(
    request: StopObjectDiscoveryRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<StopObjectDiscoveryResponse>;

  getPeerInfo(
    request: GetPeerInfoRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<PeerInfo>;

  connect(
    request: ConnectRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ConnectResponse>;

}

