import * as jspb from "google-protobuf"

export class HandshakeInfo extends jspb.Message {
  getProfileVersion(): Version | undefined;
  setProfileVersion(value?: Version): void;
  hasProfileVersion(): boolean;
  clearProfileVersion(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HandshakeInfo.AsObject;
  static toObject(includeInstance: boolean, msg: HandshakeInfo): HandshakeInfo.AsObject;
  static serializeBinaryToWriter(message: HandshakeInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HandshakeInfo;
  static deserializeBinaryFromReader(message: HandshakeInfo, reader: jspb.BinaryReader): HandshakeInfo;
}

export namespace HandshakeInfo {
  export type AsObject = {
    profileVersion?: Version.AsObject,
  }
}

export class PingRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PingRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PingRequest): PingRequest.AsObject;
  static serializeBinaryToWriter(message: PingRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PingRequest;
  static deserializeBinaryFromReader(message: PingRequest, reader: jspb.BinaryReader): PingRequest;
}

export namespace PingRequest {
  export type AsObject = {
  }
}

export class PingResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PingResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PingResponse): PingResponse.AsObject;
  static serializeBinaryToWriter(message: PingResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PingResponse;
  static deserializeBinaryFromReader(message: PingResponse, reader: jspb.BinaryReader): PingResponse;
}

export namespace PingResponse {
  export type AsObject = {
  }
}

export class GetObjectVersionRequest extends jspb.Message {
  getObjectId(): string;
  setObjectId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetObjectVersionRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetObjectVersionRequest): GetObjectVersionRequest.AsObject;
  static serializeBinaryToWriter(message: GetObjectVersionRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetObjectVersionRequest;
  static deserializeBinaryFromReader(message: GetObjectVersionRequest, reader: jspb.BinaryReader): GetObjectVersionRequest;
}

export namespace GetObjectVersionRequest {
  export type AsObject = {
    objectId: string,
  }
}

export class Version extends jspb.Message {
  getVersionVectorList(): Array<PeerVersion>;
  setVersionVectorList(value: Array<PeerVersion>): void;
  clearVersionVectorList(): void;
  addVersionVector(value?: PeerVersion, index?: number): PeerVersion;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Version.AsObject;
  static toObject(includeInstance: boolean, msg: Version): Version.AsObject;
  static serializeBinaryToWriter(message: Version, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Version;
  static deserializeBinaryFromReader(message: Version, reader: jspb.BinaryReader): Version;
}

export namespace Version {
  export type AsObject = {
    versionVectorList: Array<PeerVersion.AsObject>,
  }
}

export class PeerVersion extends jspb.Message {
  getPeer(): string;
  setPeer(value: string): void;

  getHead(): string;
  setHead(value: string): void;

  getSeq(): number;
  setSeq(value: number): void;

  getLamportTime(): number;
  setLamportTime(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PeerVersion.AsObject;
  static toObject(includeInstance: boolean, msg: PeerVersion): PeerVersion.AsObject;
  static serializeBinaryToWriter(message: PeerVersion, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PeerVersion;
  static deserializeBinaryFromReader(message: PeerVersion, reader: jspb.BinaryReader): PeerVersion;
}

export namespace PeerVersion {
  export type AsObject = {
    peer: string,
    head: string,
    seq: number,
    lamportTime: number,
  }
}

