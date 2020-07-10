import * as grpcWeb from 'grpc-web';

import {
  ConnectToPeerRequest,
  ConnectToPeerResponse,
  GenSeedRequest,
  GenSeedResponse,
  GetProfileAddrsRequest,
  GetProfileAddrsResponse,
  GetProfileRequest,
  GetProfileResponse,
  InitProfileRequest,
  InitProfileResponse,
  ListProfilesRequest,
  ListProfilesResponse,
  ListSuggestedProfilesRequest,
  ListSuggestedProfilesResponse,
  UpdateProfileRequest,
  UpdateProfileResponse} from './mintter_pb';

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

  initProfile(
    request: InitProfileRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: InitProfileResponse) => void
  ): grpcWeb.ClientReadableStream<InitProfileResponse>;

  getProfile(
    request: GetProfileRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GetProfileResponse) => void
  ): grpcWeb.ClientReadableStream<GetProfileResponse>;

  listProfiles(
    request: ListProfilesRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListProfilesResponse) => void
  ): grpcWeb.ClientReadableStream<ListProfilesResponse>;

  listSuggestedProfiles(
    request: ListSuggestedProfilesRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListSuggestedProfilesResponse) => void
  ): grpcWeb.ClientReadableStream<ListSuggestedProfilesResponse>;

  getProfileAddrs(
    request: GetProfileAddrsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GetProfileAddrsResponse) => void
  ): grpcWeb.ClientReadableStream<GetProfileAddrsResponse>;

  updateProfile(
    request: UpdateProfileRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: UpdateProfileResponse) => void
  ): grpcWeb.ClientReadableStream<UpdateProfileResponse>;

  connectToPeer(
    request: ConnectToPeerRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ConnectToPeerResponse) => void
  ): grpcWeb.ClientReadableStream<ConnectToPeerResponse>;

}

export class MintterPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  genSeed(
    request: GenSeedRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GenSeedResponse>;

  initProfile(
    request: InitProfileRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<InitProfileResponse>;

  getProfile(
    request: GetProfileRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GetProfileResponse>;

  listProfiles(
    request: ListProfilesRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListProfilesResponse>;

  listSuggestedProfiles(
    request: ListSuggestedProfilesRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListSuggestedProfilesResponse>;

  getProfileAddrs(
    request: GetProfileAddrsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GetProfileAddrsResponse>;

  updateProfile(
    request: UpdateProfileRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<UpdateProfileResponse>;

  connectToPeer(
    request: ConnectToPeerRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ConnectToPeerResponse>;

}

