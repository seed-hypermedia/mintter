/* eslint-disable */
//@ts-nocheck
import { util, configure, Writer, Reader } from "protobufjs/minimal";
import * as Long from "long";
import { grpc } from "@improbable-eng/grpc-web";
import { BrowserHeaders } from "browser-headers";

export const protobufPackage = "mintter.p2p";

export interface HandshakeRequest {
  /** Profile of the request initiator. */
  profile: Profile | undefined;
}

export interface HandshakeResponse {
  /** Profile of the responding peer. */
  profile: Profile | undefined;
}

export interface PingRequest { }

export interface PingResponse { }

export interface GetProfileRequest { }

export interface ListProfilesRequest {
  pageSize: number;
  pageToken: string;
}

export interface ListProfilesResponse {
  profiles: Profile[];
  nextPageToken: string;
}

export interface Profile {
  /** ID of the libp2p peer. */
  peerId: string;
  /** ID of the Mintter account. */
  accountId: string;
  /** Human readable username. */
  username: string;
  /** Optional. Public email. */
  email: string;
  /** Optional. Public bio. */
  bio: string;
  /** Account's public key. */
  accountPubKey: Uint8Array;
}

const baseHandshakeRequest: object = {};

export const HandshakeRequest = {
  encode(message: HandshakeRequest, writer: Writer = Writer.create()): Writer {
    if (message.profile !== undefined) {
      Profile.encode(message.profile, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): HandshakeRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseHandshakeRequest } as HandshakeRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.profile = Profile.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): HandshakeRequest {
    const message = { ...baseHandshakeRequest } as HandshakeRequest;
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromJSON(object.profile);
    } else {
      message.profile = undefined;
    }
    return message;
  },

  toJSON(message: HandshakeRequest): unknown {
    const obj: any = {};
    message.profile !== undefined &&
      (obj.profile = message.profile
        ? Profile.toJSON(message.profile)
        : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<HandshakeRequest>): HandshakeRequest {
    const message = { ...baseHandshakeRequest } as HandshakeRequest;
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromPartial(object.profile);
    } else {
      message.profile = undefined;
    }
    return message;
  },
};

const baseHandshakeResponse: object = {};

export const HandshakeResponse = {
  encode(message: HandshakeResponse, writer: Writer = Writer.create()): Writer {
    if (message.profile !== undefined) {
      Profile.encode(message.profile, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): HandshakeResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseHandshakeResponse } as HandshakeResponse;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.profile = Profile.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): HandshakeResponse {
    const message = { ...baseHandshakeResponse } as HandshakeResponse;
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromJSON(object.profile);
    } else {
      message.profile = undefined;
    }
    return message;
  },

  toJSON(message: HandshakeResponse): unknown {
    const obj: any = {};
    message.profile !== undefined &&
      (obj.profile = message.profile
        ? Profile.toJSON(message.profile)
        : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<HandshakeResponse>): HandshakeResponse {
    const message = { ...baseHandshakeResponse } as HandshakeResponse;
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromPartial(object.profile);
    } else {
      message.profile = undefined;
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

const baseGetProfileRequest: object = {};

export const GetProfileRequest = {
  encode(_: GetProfileRequest, writer: Writer = Writer.create()): Writer {
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): GetProfileRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseGetProfileRequest } as GetProfileRequest;
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

  fromJSON(_: any): GetProfileRequest {
    const message = { ...baseGetProfileRequest } as GetProfileRequest;
    return message;
  },

  toJSON(_: GetProfileRequest): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(_: DeepPartial<GetProfileRequest>): GetProfileRequest {
    const message = { ...baseGetProfileRequest } as GetProfileRequest;
    return message;
  },
};

const baseListProfilesRequest: object = { pageSize: 0, pageToken: "" };

export const ListProfilesRequest = {
  encode(
    message: ListProfilesRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.pageSize !== 0) {
      writer.uint32(8).int32(message.pageSize);
    }
    if (message.pageToken !== "") {
      writer.uint32(18).string(message.pageToken);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): ListProfilesRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListProfilesRequest } as ListProfilesRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pageSize = reader.int32();
          break;
        case 2:
          message.pageToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ListProfilesRequest {
    const message = { ...baseListProfilesRequest } as ListProfilesRequest;
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = Number(object.pageSize);
    } else {
      message.pageSize = 0;
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = String(object.pageToken);
    } else {
      message.pageToken = "";
    }
    return message;
  },

  toJSON(message: ListProfilesRequest): unknown {
    const obj: any = {};
    message.pageSize !== undefined && (obj.pageSize = message.pageSize);
    message.pageToken !== undefined && (obj.pageToken = message.pageToken);
    return obj;
  },

  fromPartial(object: DeepPartial<ListProfilesRequest>): ListProfilesRequest {
    const message = { ...baseListProfilesRequest } as ListProfilesRequest;
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = object.pageSize;
    } else {
      message.pageSize = 0;
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = object.pageToken;
    } else {
      message.pageToken = "";
    }
    return message;
  },
};

const baseListProfilesResponse: object = { nextPageToken: "" };

export const ListProfilesResponse = {
  encode(
    message: ListProfilesResponse,
    writer: Writer = Writer.create()
  ): Writer {
    for (const v of message.profiles) {
      Profile.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.nextPageToken !== "") {
      writer.uint32(18).string(message.nextPageToken);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): ListProfilesResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListProfilesResponse } as ListProfilesResponse;
    message.profiles = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.profiles.push(Profile.decode(reader, reader.uint32()));
          break;
        case 2:
          message.nextPageToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ListProfilesResponse {
    const message = { ...baseListProfilesResponse } as ListProfilesResponse;
    message.profiles = [];
    if (object.profiles !== undefined && object.profiles !== null) {
      for (const e of object.profiles) {
        message.profiles.push(Profile.fromJSON(e));
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = String(object.nextPageToken);
    } else {
      message.nextPageToken = "";
    }
    return message;
  },

  toJSON(message: ListProfilesResponse): unknown {
    const obj: any = {};
    if (message.profiles) {
      obj.profiles = message.profiles.map((e) =>
        e ? Profile.toJSON(e) : undefined
      );
    } else {
      obj.profiles = [];
    }
    message.nextPageToken !== undefined &&
      (obj.nextPageToken = message.nextPageToken);
    return obj;
  },

  fromPartial(object: DeepPartial<ListProfilesResponse>): ListProfilesResponse {
    const message = { ...baseListProfilesResponse } as ListProfilesResponse;
    message.profiles = [];
    if (object.profiles !== undefined && object.profiles !== null) {
      for (const e of object.profiles) {
        message.profiles.push(Profile.fromPartial(e));
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = object.nextPageToken;
    } else {
      message.nextPageToken = "";
    }
    return message;
  },
};

const baseProfile: object = {
  peerId: "",
  accountId: "",
  username: "",
  email: "",
  bio: "",
};

export const Profile = {
  encode(message: Profile, writer: Writer = Writer.create()): Writer {
    if (message.peerId !== "") {
      writer.uint32(10).string(message.peerId);
    }
    if (message.accountId !== "") {
      writer.uint32(18).string(message.accountId);
    }
    if (message.username !== "") {
      writer.uint32(26).string(message.username);
    }
    if (message.email !== "") {
      writer.uint32(34).string(message.email);
    }
    if (message.bio !== "") {
      writer.uint32(42).string(message.bio);
    }
    if (message.accountPubKey.length !== 0) {
      writer.uint32(50).bytes(message.accountPubKey);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Profile {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseProfile } as Profile;
    message.accountPubKey = new Uint8Array();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.peerId = reader.string();
          break;
        case 2:
          message.accountId = reader.string();
          break;
        case 3:
          message.username = reader.string();
          break;
        case 4:
          message.email = reader.string();
          break;
        case 5:
          message.bio = reader.string();
          break;
        case 6:
          message.accountPubKey = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Profile {
    const message = { ...baseProfile } as Profile;
    message.accountPubKey = new Uint8Array();
    if (object.peerId !== undefined && object.peerId !== null) {
      message.peerId = String(object.peerId);
    } else {
      message.peerId = "";
    }
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = String(object.accountId);
    } else {
      message.accountId = "";
    }
    if (object.username !== undefined && object.username !== null) {
      message.username = String(object.username);
    } else {
      message.username = "";
    }
    if (object.email !== undefined && object.email !== null) {
      message.email = String(object.email);
    } else {
      message.email = "";
    }
    if (object.bio !== undefined && object.bio !== null) {
      message.bio = String(object.bio);
    } else {
      message.bio = "";
    }
    if (object.accountPubKey !== undefined && object.accountPubKey !== null) {
      message.accountPubKey = bytesFromBase64(object.accountPubKey);
    }
    return message;
  },

  toJSON(message: Profile): unknown {
    const obj: any = {};
    message.peerId !== undefined && (obj.peerId = message.peerId);
    message.accountId !== undefined && (obj.accountId = message.accountId);
    message.username !== undefined && (obj.username = message.username);
    message.email !== undefined && (obj.email = message.email);
    message.bio !== undefined && (obj.bio = message.bio);
    message.accountPubKey !== undefined &&
      (obj.accountPubKey = base64FromBytes(
        message.accountPubKey !== undefined
          ? message.accountPubKey
          : new Uint8Array()
      ));
    return obj;
  },

  fromPartial(object: DeepPartial<Profile>): Profile {
    const message = { ...baseProfile } as Profile;
    if (object.peerId !== undefined && object.peerId !== null) {
      message.peerId = object.peerId;
    } else {
      message.peerId = "";
    }
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = object.accountId;
    } else {
      message.accountId = "";
    }
    if (object.username !== undefined && object.username !== null) {
      message.username = object.username;
    } else {
      message.username = "";
    }
    if (object.email !== undefined && object.email !== null) {
      message.email = object.email;
    } else {
      message.email = "";
    }
    if (object.bio !== undefined && object.bio !== null) {
      message.bio = object.bio;
    } else {
      message.bio = "";
    }
    if (object.accountPubKey !== undefined && object.accountPubKey !== null) {
      message.accountPubKey = object.accountPubKey;
    } else {
      message.accountPubKey = new Uint8Array();
    }
    return message;
  },
};

export interface PeerService {
  /**
   * Handshake performs profile exchange for the first time between peers.
   * This should ideally only happen once between a given pair of peers.
   */
  handshake(
    request: DeepPartial<HandshakeRequest>,
    metadata?: grpc.Metadata
  ): Promise<HandshakeResponse>;
  ping(
    request: DeepPartial<PingRequest>,
    metadata?: grpc.Metadata
  ): Promise<PingResponse>;
  getProfile(
    request: DeepPartial<GetProfileRequest>,
    metadata?: grpc.Metadata
  ): Promise<Profile>;
  listProfiles(
    request: DeepPartial<ListProfilesRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListProfilesResponse>;
}

export class PeerServiceClientImpl implements PeerService {
  private readonly rpc: Rpc;

  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.Handshake = this.Handshake.bind(this);
    this.Ping = this.Ping.bind(this);
    this.GetProfile = this.GetProfile.bind(this);
    this.ListProfiles = this.ListProfiles.bind(this);
  }

  Handshake(
    request: DeepPartial<HandshakeRequest>,
    metadata?: grpc.Metadata
  ): Promise<HandshakeResponse> {
    return this.rpc.unary(
      PeerServiceHandshakeDesc,
      HandshakeRequest.fromPartial(request),
      metadata
    );
  }

  Ping(
    request: DeepPartial<PingRequest>,
    metadata?: grpc.Metadata
  ): Promise<PingResponse> {
    return this.rpc.unary(
      PeerServicePingDesc,
      PingRequest.fromPartial(request),
      metadata
    );
  }

  GetProfile(
    request: DeepPartial<GetProfileRequest>,
    metadata?: grpc.Metadata
  ): Promise<Profile> {
    return this.rpc.unary(
      PeerServiceGetProfileDesc,
      GetProfileRequest.fromPartial(request),
      metadata
    );
  }

  ListProfiles(
    request: DeepPartial<ListProfilesRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListProfilesResponse> {
    return this.rpc.unary(
      PeerServiceListProfilesDesc,
      ListProfilesRequest.fromPartial(request),
      metadata
    );
  }
}

export const PeerServiceDesc = {
  serviceName: "mintter.p2p.PeerService",
};

export const PeerServiceHandshakeDesc: UnaryMethodDefinitionish = {
  methodName: "Handshake",
  service: PeerServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return HandshakeRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...HandshakeResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const PeerServicePingDesc: UnaryMethodDefinitionish = {
  methodName: "Ping",
  service: PeerServiceDesc,
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

export const PeerServiceGetProfileDesc: UnaryMethodDefinitionish = {
  methodName: "GetProfile",
  service: PeerServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GetProfileRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Profile.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const PeerServiceListProfilesDesc: UnaryMethodDefinitionish = {
  methodName: "ListProfiles",
  service: PeerServiceDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ListProfilesRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...ListProfilesResponse.decode(data),
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

const atob: (b64: string) => string =
  globalThis.atob ||
  ((b64) => globalThis.Buffer.from(b64, "base64").toString("binary"));
function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; ++i) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

const btoa: (bin: string) => string =
  globalThis.btoa ||
  ((bin) => globalThis.Buffer.from(bin, "binary").toString("base64"));
function base64FromBytes(arr: Uint8Array): string {
  const bin: string[] = [];
  for (let i = 0; i < arr.byteLength; ++i) {
    bin.push(String.fromCharCode(arr[i]));
  }
  return btoa(bin.join(""));
}

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

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
  util.Long = Long as any;
  configure();
}
