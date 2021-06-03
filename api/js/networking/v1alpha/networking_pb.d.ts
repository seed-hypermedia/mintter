import * as jspb from "google-protobuf"

export class StartObjectDiscoveryRequest extends jspb.Message {
  getObjectId(): string;
  setObjectId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StartObjectDiscoveryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StartObjectDiscoveryRequest): StartObjectDiscoveryRequest.AsObject;
  static serializeBinaryToWriter(message: StartObjectDiscoveryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StartObjectDiscoveryRequest;
  static deserializeBinaryFromReader(message: StartObjectDiscoveryRequest, reader: jspb.BinaryReader): StartObjectDiscoveryRequest;
}

export namespace StartObjectDiscoveryRequest {
  export type AsObject = {
    objectId: string,
  }
}

export class StartObjectDiscoveryResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StartObjectDiscoveryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: StartObjectDiscoveryResponse): StartObjectDiscoveryResponse.AsObject;
  static serializeBinaryToWriter(message: StartObjectDiscoveryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StartObjectDiscoveryResponse;
  static deserializeBinaryFromReader(message: StartObjectDiscoveryResponse, reader: jspb.BinaryReader): StartObjectDiscoveryResponse;
}

export namespace StartObjectDiscoveryResponse {
  export type AsObject = {
  }
}

export class StopObjectDiscoveryRequest extends jspb.Message {
  getObjectId(): string;
  setObjectId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StopObjectDiscoveryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StopObjectDiscoveryRequest): StopObjectDiscoveryRequest.AsObject;
  static serializeBinaryToWriter(message: StopObjectDiscoveryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StopObjectDiscoveryRequest;
  static deserializeBinaryFromReader(message: StopObjectDiscoveryRequest, reader: jspb.BinaryReader): StopObjectDiscoveryRequest;
}

export namespace StopObjectDiscoveryRequest {
  export type AsObject = {
    objectId: string,
  }
}

export class StopObjectDiscoveryResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StopObjectDiscoveryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: StopObjectDiscoveryResponse): StopObjectDiscoveryResponse.AsObject;
  static serializeBinaryToWriter(message: StopObjectDiscoveryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StopObjectDiscoveryResponse;
  static deserializeBinaryFromReader(message: StopObjectDiscoveryResponse, reader: jspb.BinaryReader): StopObjectDiscoveryResponse;
}

export namespace StopObjectDiscoveryResponse {
  export type AsObject = {
  }
}

export class GetObjectDiscoveryStatusRequest extends jspb.Message {
  getObjectId(): string;
  setObjectId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetObjectDiscoveryStatusRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetObjectDiscoveryStatusRequest): GetObjectDiscoveryStatusRequest.AsObject;
  static serializeBinaryToWriter(message: GetObjectDiscoveryStatusRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetObjectDiscoveryStatusRequest;
  static deserializeBinaryFromReader(message: GetObjectDiscoveryStatusRequest, reader: jspb.BinaryReader): GetObjectDiscoveryStatusRequest;
}

export namespace GetObjectDiscoveryStatusRequest {
  export type AsObject = {
    objectId: string,
  }
}

export class GetPeerInfoRequest extends jspb.Message {
  getPeerId(): string;
  setPeerId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPeerInfoRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPeerInfoRequest): GetPeerInfoRequest.AsObject;
  static serializeBinaryToWriter(message: GetPeerInfoRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPeerInfoRequest;
  static deserializeBinaryFromReader(message: GetPeerInfoRequest, reader: jspb.BinaryReader): GetPeerInfoRequest;
}

export namespace GetPeerInfoRequest {
  export type AsObject = {
    peerId: string,
  }
}

export class ConnectRequest extends jspb.Message {
  getAddrsList(): Array<string>;
  setAddrsList(value: Array<string>): void;
  clearAddrsList(): void;
  addAddrs(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConnectRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ConnectRequest): ConnectRequest.AsObject;
  static serializeBinaryToWriter(message: ConnectRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConnectRequest;
  static deserializeBinaryFromReader(message: ConnectRequest, reader: jspb.BinaryReader): ConnectRequest;
}

export namespace ConnectRequest {
  export type AsObject = {
    addrsList: Array<string>,
  }
}

export class ConnectResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConnectResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ConnectResponse): ConnectResponse.AsObject;
  static serializeBinaryToWriter(message: ConnectResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConnectResponse;
  static deserializeBinaryFromReader(message: ConnectResponse, reader: jspb.BinaryReader): ConnectResponse;
}

export namespace ConnectResponse {
  export type AsObject = {
  }
}

export class PeerInfo extends jspb.Message {
  getAddrsList(): Array<string>;
  setAddrsList(value: Array<string>): void;
  clearAddrsList(): void;
  addAddrs(value: string, index?: number): void;

  getConnectionStatus(): ConnectionStatus;
  setConnectionStatus(value: ConnectionStatus): void;

  getAccountId(): string;
  setAccountId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PeerInfo.AsObject;
  static toObject(includeInstance: boolean, msg: PeerInfo): PeerInfo.AsObject;
  static serializeBinaryToWriter(message: PeerInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PeerInfo;
  static deserializeBinaryFromReader(message: PeerInfo, reader: jspb.BinaryReader): PeerInfo;
}

export namespace PeerInfo {
  export type AsObject = {
    addrsList: Array<string>,
    connectionStatus: ConnectionStatus,
    accountId: string,
  }
}

export class ObjectDiscoveryStatus extends jspb.Message {
  getPeersList(): Array<string>;
  setPeersList(value: Array<string>): void;
  clearPeersList(): void;
  addPeers(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ObjectDiscoveryStatus.AsObject;
  static toObject(includeInstance: boolean, msg: ObjectDiscoveryStatus): ObjectDiscoveryStatus.AsObject;
  static serializeBinaryToWriter(message: ObjectDiscoveryStatus, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ObjectDiscoveryStatus;
  static deserializeBinaryFromReader(message: ObjectDiscoveryStatus, reader: jspb.BinaryReader): ObjectDiscoveryStatus;
}

export namespace ObjectDiscoveryStatus {
  export type AsObject = {
    peersList: Array<string>,
  }
}

export enum ConnectionStatus { 
  NOT_CONNECTED = 0,
  CONNECTED = 1,
  CAN_CONNECT = 2,
  CANNOT_CONNECT = 3,
}
