import * as jspb from "google-protobuf"

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';

export class GetAccountRequest extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetAccountRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetAccountRequest): GetAccountRequest.AsObject;
  static serializeBinaryToWriter(message: GetAccountRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetAccountRequest;
  static deserializeBinaryFromReader(message: GetAccountRequest, reader: jspb.BinaryReader): GetAccountRequest;
}

export namespace GetAccountRequest {
  export type AsObject = {
    id: string,
  }
}

export class ListAccountsRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): void;

  getPageToken(): string;
  setPageToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListAccountsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListAccountsRequest): ListAccountsRequest.AsObject;
  static serializeBinaryToWriter(message: ListAccountsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListAccountsRequest;
  static deserializeBinaryFromReader(message: ListAccountsRequest, reader: jspb.BinaryReader): ListAccountsRequest;
}

export namespace ListAccountsRequest {
  export type AsObject = {
    pageSize: number,
    pageToken: string,
  }
}

export class ListAccountsResponse extends jspb.Message {
  getAccountsList(): Array<Account>;
  setAccountsList(value: Array<Account>): void;
  clearAccountsList(): void;
  addAccounts(value?: Account, index?: number): Account;

  getNextPageToken(): string;
  setNextPageToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListAccountsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListAccountsResponse): ListAccountsResponse.AsObject;
  static serializeBinaryToWriter(message: ListAccountsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListAccountsResponse;
  static deserializeBinaryFromReader(message: ListAccountsResponse, reader: jspb.BinaryReader): ListAccountsResponse;
}

export namespace ListAccountsResponse {
  export type AsObject = {
    accountsList: Array<Account.AsObject>,
    nextPageToken: string,
  }
}

export class Account extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getProfile(): Profile | undefined;
  setProfile(value?: Profile): void;
  hasProfile(): boolean;
  clearProfile(): void;

  getDevicesMap(): jspb.Map<string, Device>;
  clearDevicesMap(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Account.AsObject;
  static toObject(includeInstance: boolean, msg: Account): Account.AsObject;
  static serializeBinaryToWriter(message: Account, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Account;
  static deserializeBinaryFromReader(message: Account, reader: jspb.BinaryReader): Account;
}

export namespace Account {
  export type AsObject = {
    id: string,
    profile?: Profile.AsObject,
    devicesMap: Array<[string, Device.AsObject]>,
  }
}

export class Profile extends jspb.Message {
  getAlias(): string;
  setAlias(value: string): void;

  getBio(): string;
  setBio(value: string): void;

  getEmail(): string;
  setEmail(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Profile.AsObject;
  static toObject(includeInstance: boolean, msg: Profile): Profile.AsObject;
  static serializeBinaryToWriter(message: Profile, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Profile;
  static deserializeBinaryFromReader(message: Profile, reader: jspb.BinaryReader): Profile;
}

export namespace Profile {
  export type AsObject = {
    alias: string,
    bio: string,
    email: string,
  }
}

export class Device extends jspb.Message {
  getPeerId(): string;
  setPeerId(value: string): void;

  getRegisterTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setRegisterTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasRegisterTime(): boolean;
  clearRegisterTime(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Device.AsObject;
  static toObject(includeInstance: boolean, msg: Device): Device.AsObject;
  static serializeBinaryToWriter(message: Device, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Device;
  static deserializeBinaryFromReader(message: Device, reader: jspb.BinaryReader): Device;
}

export namespace Device {
  export type AsObject = {
    peerId: string,
    registerTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class DeviceRegistered extends jspb.Message {
  getProof(): Uint8Array | string;
  getProof_asU8(): Uint8Array;
  getProof_asB64(): string;
  setProof(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeviceRegistered.AsObject;
  static toObject(includeInstance: boolean, msg: DeviceRegistered): DeviceRegistered.AsObject;
  static serializeBinaryToWriter(message: DeviceRegistered, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeviceRegistered;
  static deserializeBinaryFromReader(message: DeviceRegistered, reader: jspb.BinaryReader): DeviceRegistered;
}

export namespace DeviceRegistered {
  export type AsObject = {
    proof: Uint8Array | string,
  }
}

export class ProfileUpdated extends jspb.Message {
  getProfile(): Profile | undefined;
  setProfile(value?: Profile): void;
  hasProfile(): boolean;
  clearProfile(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProfileUpdated.AsObject;
  static toObject(includeInstance: boolean, msg: ProfileUpdated): ProfileUpdated.AsObject;
  static serializeBinaryToWriter(message: ProfileUpdated, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProfileUpdated;
  static deserializeBinaryFromReader(message: ProfileUpdated, reader: jspb.BinaryReader): ProfileUpdated;
}

export namespace ProfileUpdated {
  export type AsObject = {
    profile?: Profile.AsObject,
  }
}

