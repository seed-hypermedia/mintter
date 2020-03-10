import * as jspb from "google-protobuf"

export class GenSeedRequest extends jspb.Message {
  getAezeedPassphrase(): Uint8Array | string;
  getAezeedPassphrase_asU8(): Uint8Array;
  getAezeedPassphrase_asB64(): string;
  setAezeedPassphrase(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GenSeedRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GenSeedRequest): GenSeedRequest.AsObject;
  static serializeBinaryToWriter(message: GenSeedRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GenSeedRequest;
  static deserializeBinaryFromReader(message: GenSeedRequest, reader: jspb.BinaryReader): GenSeedRequest;
}

export namespace GenSeedRequest {
  export type AsObject = {
    aezeedPassphrase: Uint8Array | string,
  }
}

export class GenSeedResponse extends jspb.Message {
  getMnemonicList(): Array<string>;
  setMnemonicList(value: Array<string>): void;
  clearMnemonicList(): void;
  addMnemonic(value: string, index?: number): void;

  getEncipheredSeed(): Uint8Array | string;
  getEncipheredSeed_asU8(): Uint8Array;
  getEncipheredSeed_asB64(): string;
  setEncipheredSeed(value: Uint8Array | string): void;

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
    encipheredSeed: Uint8Array | string,
  }
}

