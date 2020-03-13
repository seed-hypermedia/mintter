import * as grpcWeb from 'grpc-web';

import {
  GenSeedRequest,
  GenSeedResponse,
  InitWalletRequest,
  InitWalletResponse} from './mintter_pb';

export class MintterClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  genSeed(
    request: GenSeedRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GenSeedResponse) => void
  ): grpcWeb.ClientReadableStream<GenSeedResponse>;

  initWallet(
    request: InitWalletRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: InitWalletResponse) => void
  ): grpcWeb.ClientReadableStream<InitWalletResponse>;

}

export class MintterPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  genSeed(
    request: GenSeedRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GenSeedResponse>;

  initWallet(
    request: InitWalletRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<InitWalletResponse>;

}

