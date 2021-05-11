import * as grpcWeb from 'grpc-web';

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';

import {
  GenSeedRequest,
  GenSeedResponse,
  GetInfoRequest,
  Info,
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

  getInfo(
    request: GetInfoRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Info) => void
  ): grpcWeb.ClientReadableStream<Info>;

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

  getInfo(
    request: GetInfoRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Info>;

}

