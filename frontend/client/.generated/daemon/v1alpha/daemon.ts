/* eslint-disable */
import {util, configure, Writer, Reader} from 'protobufjs/minimal'
import * as Long from 'long'
import {grpc} from '@improbable-eng/grpc-web'
import {BrowserHeaders} from 'browser-headers'
import {Timestamp} from '../../google/protobuf/timestamp'

export const protobufPackage = 'com.mintter.daemon.v1alpha'

export interface GenSeedRequest {
  /** Passphrase that will be used to encipher the seed. */
  aezeedPassphrase: string
}

export interface GenSeedResponse {
  /**
   * The list of human-friendly words that can be used to backup the seed. These
   * words must be stored in a secret place by the user.
   */
  mnemonic: string[]
}

export interface RegisterRequest {
  mnemonic: string[]
  aezeedPassphrase: string
}

export interface RegisterResponse {
  accountId: string
}

export interface GetInfoRequest {}

/** Info is a generic information about the running node. */
export interface Info {
  /** Account ID this node belongs to. */
  accountId: string
  /** Peer ID assigned to this node. */
  peerId: string
  /** Start time of the node. */
  startTime: Date | undefined
}

const baseGenSeedRequest: object = {aezeedPassphrase: ''}

export const GenSeedRequest = {
  encode(message: GenSeedRequest, writer: Writer = Writer.create()): Writer {
    if (message.aezeedPassphrase !== '') {
      writer.uint32(10).string(message.aezeedPassphrase)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): GenSeedRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseGenSeedRequest} as GenSeedRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.aezeedPassphrase = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): GenSeedRequest {
    const message = {...baseGenSeedRequest} as GenSeedRequest
    if (object.aezeedPassphrase !== undefined && object.aezeedPassphrase !== null) {
      message.aezeedPassphrase = String(object.aezeedPassphrase)
    } else {
      message.aezeedPassphrase = ''
    }
    return message
  },

  toJSON(message: GenSeedRequest): unknown {
    const obj: any = {}
    message.aezeedPassphrase !== undefined && (obj.aezeedPassphrase = message.aezeedPassphrase)
    return obj
  },

  fromPartial(object: DeepPartial<GenSeedRequest>): GenSeedRequest {
    const message = {...baseGenSeedRequest} as GenSeedRequest
    if (object.aezeedPassphrase !== undefined && object.aezeedPassphrase !== null) {
      message.aezeedPassphrase = object.aezeedPassphrase
    } else {
      message.aezeedPassphrase = ''
    }
    return message
  },
}

const baseGenSeedResponse: object = {mnemonic: ''}

export const GenSeedResponse = {
  encode(message: GenSeedResponse, writer: Writer = Writer.create()): Writer {
    for (const v of message.mnemonic) {
      writer.uint32(10).string(v!)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): GenSeedResponse {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseGenSeedResponse} as GenSeedResponse
    message.mnemonic = []
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.mnemonic.push(reader.string())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): GenSeedResponse {
    const message = {...baseGenSeedResponse} as GenSeedResponse
    message.mnemonic = []
    if (object.mnemonic !== undefined && object.mnemonic !== null) {
      for (const e of object.mnemonic) {
        message.mnemonic.push(String(e))
      }
    }
    return message
  },

  toJSON(message: GenSeedResponse): unknown {
    const obj: any = {}
    if (message.mnemonic) {
      obj.mnemonic = message.mnemonic.map((e) => e)
    } else {
      obj.mnemonic = []
    }
    return obj
  },

  fromPartial(object: DeepPartial<GenSeedResponse>): GenSeedResponse {
    const message = {...baseGenSeedResponse} as GenSeedResponse
    message.mnemonic = []
    if (object.mnemonic !== undefined && object.mnemonic !== null) {
      for (const e of object.mnemonic) {
        message.mnemonic.push(e)
      }
    }
    return message
  },
}

const baseRegisterRequest: object = {mnemonic: '', aezeedPassphrase: ''}

export const RegisterRequest = {
  encode(message: RegisterRequest, writer: Writer = Writer.create()): Writer {
    for (const v of message.mnemonic) {
      writer.uint32(10).string(v!)
    }
    if (message.aezeedPassphrase !== '') {
      writer.uint32(18).string(message.aezeedPassphrase)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): RegisterRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseRegisterRequest} as RegisterRequest
    message.mnemonic = []
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.mnemonic.push(reader.string())
          break
        case 2:
          message.aezeedPassphrase = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): RegisterRequest {
    const message = {...baseRegisterRequest} as RegisterRequest
    message.mnemonic = []
    if (object.mnemonic !== undefined && object.mnemonic !== null) {
      for (const e of object.mnemonic) {
        message.mnemonic.push(String(e))
      }
    }
    if (object.aezeedPassphrase !== undefined && object.aezeedPassphrase !== null) {
      message.aezeedPassphrase = String(object.aezeedPassphrase)
    } else {
      message.aezeedPassphrase = ''
    }
    return message
  },

  toJSON(message: RegisterRequest): unknown {
    const obj: any = {}
    if (message.mnemonic) {
      obj.mnemonic = message.mnemonic.map((e) => e)
    } else {
      obj.mnemonic = []
    }
    message.aezeedPassphrase !== undefined && (obj.aezeedPassphrase = message.aezeedPassphrase)
    return obj
  },

  fromPartial(object: DeepPartial<RegisterRequest>): RegisterRequest {
    const message = {...baseRegisterRequest} as RegisterRequest
    message.mnemonic = []
    if (object.mnemonic !== undefined && object.mnemonic !== null) {
      for (const e of object.mnemonic) {
        message.mnemonic.push(e)
      }
    }
    if (object.aezeedPassphrase !== undefined && object.aezeedPassphrase !== null) {
      message.aezeedPassphrase = object.aezeedPassphrase
    } else {
      message.aezeedPassphrase = ''
    }
    return message
  },
}

const baseRegisterResponse: object = {accountId: ''}

export const RegisterResponse = {
  encode(message: RegisterResponse, writer: Writer = Writer.create()): Writer {
    if (message.accountId !== '') {
      writer.uint32(10).string(message.accountId)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): RegisterResponse {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseRegisterResponse} as RegisterResponse
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.accountId = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): RegisterResponse {
    const message = {...baseRegisterResponse} as RegisterResponse
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = String(object.accountId)
    } else {
      message.accountId = ''
    }
    return message
  },

  toJSON(message: RegisterResponse): unknown {
    const obj: any = {}
    message.accountId !== undefined && (obj.accountId = message.accountId)
    return obj
  },

  fromPartial(object: DeepPartial<RegisterResponse>): RegisterResponse {
    const message = {...baseRegisterResponse} as RegisterResponse
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = object.accountId
    } else {
      message.accountId = ''
    }
    return message
  },
}

const baseGetInfoRequest: object = {}

export const GetInfoRequest = {
  encode(_: GetInfoRequest, writer: Writer = Writer.create()): Writer {
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): GetInfoRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseGetInfoRequest} as GetInfoRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(_: any): GetInfoRequest {
    const message = {...baseGetInfoRequest} as GetInfoRequest
    return message
  },

  toJSON(_: GetInfoRequest): unknown {
    const obj: any = {}
    return obj
  },

  fromPartial(_: DeepPartial<GetInfoRequest>): GetInfoRequest {
    const message = {...baseGetInfoRequest} as GetInfoRequest
    return message
  },
}

const baseInfo: object = {accountId: '', peerId: ''}

export const Info = {
  encode(message: Info, writer: Writer = Writer.create()): Writer {
    if (message.accountId !== '') {
      writer.uint32(10).string(message.accountId)
    }
    if (message.peerId !== '') {
      writer.uint32(18).string(message.peerId)
    }
    if (message.startTime !== undefined) {
      Timestamp.encode(toTimestamp(message.startTime), writer.uint32(26).fork()).ldelim()
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Info {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseInfo} as Info
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.accountId = reader.string()
          break
        case 2:
          message.peerId = reader.string()
          break
        case 3:
          message.startTime = fromTimestamp(Timestamp.decode(reader, reader.uint32()))
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Info {
    const message = {...baseInfo} as Info
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = String(object.accountId)
    } else {
      message.accountId = ''
    }
    if (object.peerId !== undefined && object.peerId !== null) {
      message.peerId = String(object.peerId)
    } else {
      message.peerId = ''
    }
    if (object.startTime !== undefined && object.startTime !== null) {
      message.startTime = fromJsonTimestamp(object.startTime)
    } else {
      message.startTime = undefined
    }
    return message
  },

  toJSON(message: Info): unknown {
    const obj: any = {}
    message.accountId !== undefined && (obj.accountId = message.accountId)
    message.peerId !== undefined && (obj.peerId = message.peerId)
    message.startTime !== undefined && (obj.startTime = message.startTime.toISOString())
    return obj
  },

  fromPartial(object: DeepPartial<Info>): Info {
    const message = {...baseInfo} as Info
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = object.accountId
    } else {
      message.accountId = ''
    }
    if (object.peerId !== undefined && object.peerId !== null) {
      message.peerId = object.peerId
    } else {
      message.peerId = ''
    }
    if (object.startTime !== undefined && object.startTime !== null) {
      message.startTime = object.startTime
    } else {
      message.startTime = undefined
    }
    return message
  },
}

/** Daemon API encapsulates main functionality of the Mintter daemon. */
export interface Daemon {
  /**
   * Generates cryptographic seed that is used to derive Mintter Account Key.
   * It's currenly supposed to be using LND's Aezeed implementation, which solves some
   * of the issues with BIP-39. The seed is encoded as a mnemonic of 24 human-readable words.
   * The seed could be reconstructed given these words and the passphrase.
   *
   * See: https://github.com/lightningnetwork/lnd/tree/master/aezeed.
   */
  genSeed(request: DeepPartial<GenSeedRequest>, metadata?: grpc.Metadata): Promise<GenSeedResponse>
  /**
   * After generating the seed, this call is used to commit the seed and
   * create an account binding between the device and account.
   */
  register(request: DeepPartial<RegisterRequest>, metadata?: grpc.Metadata): Promise<RegisterResponse>
  /** Get generic information about the running node. */
  getInfo(request: DeepPartial<GetInfoRequest>, metadata?: grpc.Metadata): Promise<Info>
}

export class DaemonClientImpl implements Daemon {
  private readonly rpc: Rpc

  constructor(rpc: Rpc) {
    this.rpc = rpc
    this.GenSeed = this.GenSeed.bind(this)
    this.Register = this.Register.bind(this)
    this.GetInfo = this.GetInfo.bind(this)
  }

  GenSeed(request: DeepPartial<GenSeedRequest>, metadata?: grpc.Metadata): Promise<GenSeedResponse> {
    return this.rpc.unary(DaemonGenSeedDesc, GenSeedRequest.fromPartial(request), metadata)
  }

  Register(request: DeepPartial<RegisterRequest>, metadata?: grpc.Metadata): Promise<RegisterResponse> {
    return this.rpc.unary(DaemonRegisterDesc, RegisterRequest.fromPartial(request), metadata)
  }

  GetInfo(request: DeepPartial<GetInfoRequest>, metadata?: grpc.Metadata): Promise<Info> {
    return this.rpc.unary(DaemonGetInfoDesc, GetInfoRequest.fromPartial(request), metadata)
  }
}

export const DaemonDesc = {
  serviceName: 'com.mintter.daemon.v1alpha.Daemon',
}

export const DaemonGenSeedDesc: UnaryMethodDefinitionish = {
  methodName: 'GenSeed',
  service: DaemonDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GenSeedRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...GenSeedResponse.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const DaemonRegisterDesc: UnaryMethodDefinitionish = {
  methodName: 'Register',
  service: DaemonDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return RegisterRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...RegisterResponse.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const DaemonGetInfoDesc: UnaryMethodDefinitionish = {
  methodName: 'GetInfo',
  service: DaemonDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GetInfoRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Info.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

interface UnaryMethodDefinitionishR extends grpc.UnaryMethodDefinition<any, any> {
  requestStream: any
  responseStream: any
}

type UnaryMethodDefinitionish = UnaryMethodDefinitionishR

interface Rpc {
  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    request: any,
    metadata: grpc.Metadata | undefined,
  ): Promise<any>
}

export class GrpcWebImpl {
  private host: string
  private options: {
    transport?: grpc.TransportFactory

    debug?: boolean
    metadata?: grpc.Metadata
  }

  constructor(
    host: string,
    options: {
      transport?: grpc.TransportFactory

      debug?: boolean
      metadata?: grpc.Metadata
    },
  ) {
    this.host = host
    this.options = options
  }

  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    _request: any,
    metadata: grpc.Metadata | undefined,
  ): Promise<any> {
    const request = {..._request, ...methodDesc.requestType}
    const maybeCombinedMetadata =
      metadata && this.options.metadata
        ? new BrowserHeaders({...this.options?.metadata.headersMap, ...metadata?.headersMap})
        : metadata || this.options.metadata
    return new Promise((resolve, reject) => {
      grpc.unary(methodDesc, {
        request,
        host: this.host,
        metadata: maybeCombinedMetadata,
        transport: this.options.transport,
        debug: this.options.debug,
        onEnd: function (response) {
          if (response.status === grpc.Code.OK) {
            resolve(response.message)
          } else {
            const err = new Error(response.statusMessage) as any
            err.code = response.status
            err.metadata = response.trailers
            reject(err)
          }
        },
      })
    })
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined
export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? {[K in keyof T]?: DeepPartial<T[K]>}
  : Partial<T>

function toTimestamp(date: Date): Timestamp {
  const seconds = date.getTime() / 1_000
  const nanos = (date.getTime() % 1_000) * 1_000_000
  return {seconds, nanos}
}

function fromTimestamp(t: Timestamp): Date {
  let millis = t.seconds * 1_000
  millis += t.nanos / 1_000_000
  return new Date(millis)
}

function fromJsonTimestamp(o: any): Date {
  if (o instanceof Date) {
    return o
  } else if (typeof o === 'string') {
    return new Date(o)
  } else {
    return fromTimestamp(Timestamp.fromJSON(o))
  }
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
  util.Long = Long as any
  configure()
}
