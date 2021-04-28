import * as jspb from "google-protobuf"

export class StartAccountDiscoveryRequest extends jspb.Message {
  getAccountId(): string;
  setAccountId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StartAccountDiscoveryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StartAccountDiscoveryRequest): StartAccountDiscoveryRequest.AsObject;
  static serializeBinaryToWriter(message: StartAccountDiscoveryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StartAccountDiscoveryRequest;
  static deserializeBinaryFromReader(message: StartAccountDiscoveryRequest, reader: jspb.BinaryReader): StartAccountDiscoveryRequest;
}

export namespace StartAccountDiscoveryRequest {
  export type AsObject = {
    accountId: string,
  }
}

export class StartAccountDiscoveryResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StartAccountDiscoveryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: StartAccountDiscoveryResponse): StartAccountDiscoveryResponse.AsObject;
  static serializeBinaryToWriter(message: StartAccountDiscoveryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StartAccountDiscoveryResponse;
  static deserializeBinaryFromReader(message: StartAccountDiscoveryResponse, reader: jspb.BinaryReader): StartAccountDiscoveryResponse;
}

export namespace StartAccountDiscoveryResponse {
  export type AsObject = {
  }
}

export class GetPeerAddrsRequest extends jspb.Message {
  getPeerId(): string;
  setPeerId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPeerAddrsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPeerAddrsRequest): GetPeerAddrsRequest.AsObject;
  static serializeBinaryToWriter(message: GetPeerAddrsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPeerAddrsRequest;
  static deserializeBinaryFromReader(message: GetPeerAddrsRequest, reader: jspb.BinaryReader): GetPeerAddrsRequest;
}

export namespace GetPeerAddrsRequest {
  export type AsObject = {
    peerId: string,
  }
}

export class GetPeerAddrsResponse extends jspb.Message {
  getAddrsList(): Array<string>;
  setAddrsList(value: Array<string>): void;
  clearAddrsList(): void;
  addAddrs(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPeerAddrsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetPeerAddrsResponse): GetPeerAddrsResponse.AsObject;
  static serializeBinaryToWriter(message: GetPeerAddrsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPeerAddrsResponse;
  static deserializeBinaryFromReader(message: GetPeerAddrsResponse, reader: jspb.BinaryReader): GetPeerAddrsResponse;
}

export namespace GetPeerAddrsResponse {
  export type AsObject = {
    addrsList: Array<string>,
  }
}

