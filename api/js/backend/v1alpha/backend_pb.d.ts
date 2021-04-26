import * as jspb from "google-protobuf"

export class GenSeedRequest extends jspb.Message {
  getAezeedPassphrase(): string;
  setAezeedPassphrase(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GenSeedRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GenSeedRequest): GenSeedRequest.AsObject;
  static serializeBinaryToWriter(message: GenSeedRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GenSeedRequest;
  static deserializeBinaryFromReader(message: GenSeedRequest, reader: jspb.BinaryReader): GenSeedRequest;
}

export namespace GenSeedRequest {
  export type AsObject = {
    aezeedPassphrase: string,
  }
}

export class GenSeedResponse extends jspb.Message {
  getMnemonicList(): Array<string>;
  setMnemonicList(value: Array<string>): void;
  clearMnemonicList(): void;
  addMnemonic(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GenSeedResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GenSeedResponse): GenSeedResponse.AsObject;
  static serializeBinaryToWriter(message: GenSeedResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GenSeedResponse;
  static deserializeBinaryFromReader(message: GenSeedResponse, reader: jspb.BinaryReader): GenSeedResponse;
}

export namespace GenSeedResponse {
  export type AsObject = {
    mnemonicList: Array<string>,
  }
}

export class BindAccountRequest extends jspb.Message {
  getMnemonicList(): Array<string>;
  setMnemonicList(value: Array<string>): void;
  clearMnemonicList(): void;
  addMnemonic(value: string, index?: number): void;

  getAezeedPassphrase(): string;
  setAezeedPassphrase(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BindAccountRequest.AsObject;
  static toObject(includeInstance: boolean, msg: BindAccountRequest): BindAccountRequest.AsObject;
  static serializeBinaryToWriter(message: BindAccountRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BindAccountRequest;
  static deserializeBinaryFromReader(message: BindAccountRequest, reader: jspb.BinaryReader): BindAccountRequest;
}

export namespace BindAccountRequest {
  export type AsObject = {
    mnemonicList: Array<string>,
    aezeedPassphrase: string,
  }
}

export class BindAccountResponse extends jspb.Message {
  getAccountId(): string;
  setAccountId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BindAccountResponse.AsObject;
  static toObject(includeInstance: boolean, msg: BindAccountResponse): BindAccountResponse.AsObject;
  static serializeBinaryToWriter(message: BindAccountResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BindAccountResponse;
  static deserializeBinaryFromReader(message: BindAccountResponse, reader: jspb.BinaryReader): BindAccountResponse;
}

export namespace BindAccountResponse {
  export type AsObject = {
    accountId: string,
  }
}

export class DialPeerRequest extends jspb.Message {
  getAddrsList(): Array<string>;
  setAddrsList(value: Array<string>): void;
  clearAddrsList(): void;
  addAddrs(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DialPeerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DialPeerRequest): DialPeerRequest.AsObject;
  static serializeBinaryToWriter(message: DialPeerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DialPeerRequest;
  static deserializeBinaryFromReader(message: DialPeerRequest, reader: jspb.BinaryReader): DialPeerRequest;
}

export namespace DialPeerRequest {
  export type AsObject = {
    addrsList: Array<string>,
  }
}

export class DialPeerResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DialPeerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DialPeerResponse): DialPeerResponse.AsObject;
  static serializeBinaryToWriter(message: DialPeerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DialPeerResponse;
  static deserializeBinaryFromReader(message: DialPeerResponse, reader: jspb.BinaryReader): DialPeerResponse;
}

export namespace DialPeerResponse {
  export type AsObject = {
  }
}

