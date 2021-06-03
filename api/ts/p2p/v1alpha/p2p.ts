/* eslint-disable */
//@ts-nocheck
import { util, configure, Writer, Reader } from "protobufjs/minimal";
import * as Long from "long";
import { grpc } from "@improbable-eng/grpc-web";
import { BrowserHeaders } from "browser-headers";

export const protobufPackage = "com.mintter.p2p.v1alpha";

export interface HandshakeInfo {
  profileVersion: Version | undefined;
}

export interface PingRequest { }

export interface PingResponse { }

export interface GetObjectVersionRequest {
  objectId: string;
}

export interface Version {
  versionVector: PeerVersion[];
}

export interface PeerVersion {
  peer: string;
  head: string;
  seq: number;
  lamportTime: number;
}

const baseHandshakeInfo: object = {};

export const HandshakeInfo = {
  encode(message: HandshakeInfo, writer: Writer = Writer.create()): Writer {
    if (message.profileVersion !== undefined) {
      Version.encode(message.profileVersion, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): HandshakeInfo {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseHandshakeInfo } as HandshakeInfo;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.profileVersion = Version.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): HandshakeInfo {
    const message = { ...baseHandshakeInfo } as HandshakeInfo;
    if (object.profileVersion !== undefined && object.profileVersion !== null) {
      message.profileVersion = Version.fromJSON(object.profileVersion);
    } else {
      message.profileVersion = undefined;
    }
    return message;
  },

  toJSON(message: HandshakeInfo): unknown {
    const obj: any = {};
    message.profileVersion !== undefined &&
      (obj.profileVersion = message.profileVersion
        ? Version.toJSON(message.profileVersion)
        : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<HandshakeInfo>): HandshakeInfo {
    const message = { ...baseHandshakeInfo } as HandshakeInfo;
    if (object.profileVersion !== undefined && object.profileVersion !== null) {
      message.profileVersion = Version.fromPartial(object.profileVersion);
    } else {
      message.profileVersion = undefined;
    }
    return message;
  },
};

const basePingRequest: object = {};

export const PingRequest = {
  encode(_: PingRequest, writer: Writer = Writer.create()): Writer {
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): PingRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...basePingRequest } as PingRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): PingRequest {
    const message = { ...basePingRequest } as PingRequest;
    return message;
  },

  toJSON(_: PingRequest): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(_: DeepPartial<PingRequest>): PingRequest {
    const message = { ...basePingRequest } as PingRequest;
    return message;
  },
};

const basePingResponse: object = {};

export const PingResponse = {
  encode(_: PingResponse, writer: Writer = Writer.create()): Writer {
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): PingResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...basePingResponse } as PingResponse;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): PingResponse {
    const message = { ...basePingResponse } as PingResponse;
    return message;
  },

  toJSON(_: PingResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(_: DeepPartial<PingResponse>): PingResponse {
    const message = { ...basePingResponse } as PingResponse;
    return message;
  },
};

const baseGetObjectVersionRequest: object = { objectId: "" };

export const GetObjectVersionRequest = {
  encode(
    message: GetObjectVersionRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.objectId !== "") {
      writer.uint32(10).string(message.objectId);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): GetObjectVersionRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = {
      ...baseGetObjectVersionRequest,
    } as GetObjectVersionRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.objectId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): GetObjectVersionRequest {
    const message = {
      ...baseGetObjectVersionRequest,
    } as GetObjectVersionRequest;
    if (object.objectId !== undefined && object.objectId !== null) {
      message.objectId = String(object.objectId);
    } else {
      message.objectId = "";
    }
    return message;
  },

  toJSON(message: GetObjectVersionRequest): unknown {
    const obj: any = {};
    message.objectId !== undefined && (obj.objectId = message.objectId);
    return obj;
  },

  fromPartial(
    object: DeepPartial<GetObjectVersionRequest>
  ): GetObjectVersionRequest {
    const message = {
      ...baseGetObjectVersionRequest,
    } as GetObjectVersionRequest;
    if (object.objectId !== undefined && object.objectId !== null) {
      message.objectId = object.objectId;
    } else {
      message.objectId = "";
    }
    return message;
  },
};

const baseVersion: object = {};

export const Version = {
  encode(message: Version, writer: Writer = Writer.create()): Writer {
    for (const v of message.versionVector) {
      PeerVersion.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Version {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseVersion } as Version;
    message.versionVector = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.versionVector.push(
            PeerVersion.decode(reader, reader.uint32())
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Version {
    const message = { ...baseVersion } as Version;
    message.versionVector = [];
    if (object.versionVector !== undefined && object.versionVector !== null) {
      for (const e of object.versionVector) {
        message.versionVector.push(PeerVersion.fromJSON(e));
      }
    }
    return message;
  },

  toJSON(message: Version): unknown {
    const obj: any = {};
    if (message.versionVector) {
      obj.versionVector = message.versionVector.map((e) =>
        e ? PeerVersion.toJSON(e) : undefined
      );
    } else {
      obj.versionVector = [];
    }
    return obj;
  },

  fromPartial(object: DeepPartial<Version>): Version {
    const message = { ...baseVersion } as Version;
    message.versionVector = [];
    if (object.versionVector !== undefined && object.versionVector !== null) {
      for (const e of object.versionVector) {
        message.versionVector.push(PeerVersion.fromPartial(e));
      }
    }
    return message;
  },
};

const basePeerVersion: object = { peer: "", head: "", seq: 0, lamportTime: 0 };

export const PeerVersion = {
  encode(message: PeerVersion, writer: Writer = Writer.create()): Writer {
    if (message.peer !== "") {
      writer.uint32(10).string(message.peer);
    }
    if (message.head !== "") {
      writer.uint32(18).string(message.head);
    }
    if (message.seq !== 0) {
      writer.uint32(24).uint64(message.seq);
    }
    if (message.lamportTime !== 0) {
      writer.uint32(32).uint64(message.lamportTime);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): PeerVersion {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...basePeerVersion } as PeerVersion;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.peer = reader.string();
          break;
        case 2:
          message.head = reader.string();
          break;
        case 3:
          message.seq = longToNumber(reader.uint64() as Long);
          break;
        case 4:
          message.lamportTime = longToNumber(reader.uint64() as Long);
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PeerVersion {
    const message = { ...basePeerVersion } as PeerVersion;
    if (object.peer !== undefined && object.peer !== null) {
      message.peer = String(object.peer);
    } else {
      message.peer = "";
    }
    if (object.head !== undefined && object.head !== null) {
      message.head = String(object.head);
    } else {
      message.head = "";
    }
    if (object.seq !== undefined && object.seq !== null) {
      message.seq = Number(object.seq);
    } else {
      message.seq = 0;
    }
    if (object.lamportTime !== undefined && object.lamportTime !== null) {
      message.lamportTime = Number(object.lamportTime);
    } else {
      message.lamportTime = 0;
    }
    return message;
  },

  toJSON(message: PeerVersion): unknown {
    const obj: any = {};
    message.peer !== undefined && (obj.peer = message.peer);
    message.head !== undefined && (obj.head = message.head);
    message.seq !== undefined && (obj.seq = message.seq);
    message.lamportTime !== undefined &&
      (obj.lamportTime = message.lamportTime);
    return obj;
  },

  fromPartial(object: DeepPartial<PeerVersion>): PeerVersion {
    const message = { ...basePeerVersion } as PeerVersion;
    if (object.peer !== undefined && object.peer !== null) {
      message.peer = object.peer;
    } else {
      message.peer = "";
    }
    if (object.head !== undefined && object.head !== null) {
      message.head = object.head;
    } else {
      message.head = "";
    }
    if (object.seq !== undefined && object.seq !== null) {
      message.seq = object.seq;
    } else {
      message.seq = 0;
    }
    if (object.lamportTime !== undefined && object.lamportTime !== null) {
      message.lamportTime = object.lamportTime;
    } else {
      message.lamportTime = 0;
    }
    return message;
  },
};

/** Mintter P2P API. */
export interface P2P {
  handshake(
    request: DeepPartial<HandshakeInfo>,
    metadata?: grpc.Metadata
  ): Promise<HandshakeInfo>;
  ping(
    request: DeepPartial<PingRequest>,
    metadata?: grpc.Metadata
  ): Promise<PingResponse>;
  getObjectVersion(
    request: DeepPartial<GetObjectVersionRequest>,
    metadata?: grpc.Metadata
  ): Promise<Version>;
}

export class P2PClientImpl implements P2P {
  private readonly rpc: Rpc;

  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.Handshake = this.Handshake.bind(this);
    this.Ping = this.Ping.bind(this);
    this.GetObjectVersion = this.GetObjectVersion.bind(this);
  }

  Handshake(
    request: DeepPartial<HandshakeInfo>,
    metadata?: grpc.Metadata
  ): Promise<HandshakeInfo> {
    return this.rpc.unary(
      P2PHandshakeDesc,
      HandshakeInfo.fromPartial(request),
      metadata
    );
  }

  Ping(
    request: DeepPartial<PingRequest>,
    metadata?: grpc.Metadata
  ): Promise<PingResponse> {
    return this.rpc.unary(
      P2PPingDesc,
      PingRequest.fromPartial(request),
      metadata
    );
  }

  GetObjectVersion(
    request: DeepPartial<GetObjectVersionRequest>,
    metadata?: grpc.Metadata
  ): Promise<Version> {
    return this.rpc.unary(
      P2PGetObjectVersionDesc,
      GetObjectVersionRequest.fromPartial(request),
      metadata
    );
  }
}

export const P2PDesc = {
  serviceName: "com.mintter.p2p.v1alpha.P2P",
};

export const P2PHandshakeDesc: UnaryMethodDefinitionish = {
  methodName: "Handshake",
  service: P2PDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return HandshakeInfo.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...HandshakeInfo.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const P2PPingDesc: UnaryMethodDefinitionish = {
  methodName: "Ping",
  service: P2PDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return PingRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...PingResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const P2PGetObjectVersionDesc: UnaryMethodDefinitionish = {
  methodName: "GetObjectVersion",
  service: P2PDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GetObjectVersionRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Version.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

interface UnaryMethodDefinitionishR
  extends grpc.UnaryMethodDefinition<any, any> {
  requestStream: any;
  responseStream: any;
}

type UnaryMethodDefinitionish = UnaryMethodDefinitionishR;

interface Rpc {
  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    request: any,
    metadata: grpc.Metadata | undefined
  ): Promise<any>;
}

export class GrpcWebImpl {
  private host: string;
  private options: {
    transport?: grpc.TransportFactory;

    debug?: boolean;
    metadata?: grpc.Metadata;
  };

  constructor(
    host: string,
    options: {
      transport?: grpc.TransportFactory;

      debug?: boolean;
      metadata?: grpc.Metadata;
    }
  ) {
    this.host = host;
    this.options = options;
  }

  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    _request: any,
    metadata: grpc.Metadata | undefined
  ): Promise<any> {
    const request = { ..._request, ...methodDesc.requestType };
    const maybeCombinedMetadata =
      metadata && this.options.metadata
        ? new BrowserHeaders({
          ...this.options?.metadata.headersMap,
          ...metadata?.headersMap,
        })
        : metadata || this.options.metadata;
    return new Promise((resolve, reject) => {
      grpc.unary(methodDesc, {
        request,
        host: this.host,
        metadata: maybeCombinedMetadata,
        transport: this.options.transport,
        debug: this.options.debug,
        onEnd: function (response) {
          if (response.status === grpc.Code.OK) {
            resolve(response.message);
          } else {
            const err = new Error(response.statusMessage) as any;
            err.code = response.status;
            err.metadata = response.trailers;
            reject(err);
          }
        },
      });
    });
  }
}

declare var self: any | undefined;
declare var window: any | undefined;
var globalThis: any = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  throw "Unable to locate global object";
})();

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;
export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new globalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
  util.Long = Long as any;
  configure();
}
