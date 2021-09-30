//@ts-nocheck
/* eslint-disable */
import Long from "long";
import { grpc } from "@improbable-eng/grpc-web";
import _m0 from "protobufjs/minimal";
import { BrowserHeaders } from "browser-headers";

/** Request to list mentions. */
export interface ListMentionsRequest {
  /** Required. ID of the document to list mentions for. */
  documentId: string;
  /**
   * Optional. Depth can be used to request transitive mentions for a document.
   * For example depth=1 will return not only mentions of the requested document_id
   * but also mentions of those direct mentions. The default is depth=0 and will only
   * return direct mentions.
   */
  depth: number;
}

/** Response with the list of mentions. */
export interface ListMentionsResponse {
  /** List of mentions of the requested document. */
  mentions: Mention[];
}

/**
 * Mention is a description of a link with the two sides specified.
 *
 * Apparently there's no single well-established unambiguous
 * way to name the two different sides of a link. In this case
 * we use the terminology described in this page: https://www.semrush.com/kb/501-backlinks-report-manual#readingyourreport,
 * i.e. source is where the link was found, target is where the link points to.
 */
export interface Mention {
  /** Required. The document ID that the foreign link points to. */
  targetDocumentId: string;
  /**
   * Optional. The block ID that the foreign link points to. Can be empty
   * if the original link was to the whole document.
   */
  targetBlockId: string;
  /** Required. The ID of the document where the link was found. */
  sourceDocumentId: string;
  /** Required. The ID of the block where the link was found. */
  sourceBlockId: string;
}

const baseListMentionsRequest: object = { documentId: "", depth: 0 };

export const ListMentionsRequest = {
  encode(
    message: ListMentionsRequest,
    writer: _m0.Writer = _m0.Writer.create()
  ): _m0.Writer {
    if (message.documentId !== "") {
      writer.uint32(10).string(message.documentId);
    }
    if (message.depth !== 0) {
      writer.uint32(16).int32(message.depth);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ListMentionsRequest {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListMentionsRequest } as ListMentionsRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.documentId = reader.string();
          break;
        case 2:
          message.depth = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ListMentionsRequest {
    const message = { ...baseListMentionsRequest } as ListMentionsRequest;
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = String(object.documentId);
    } else {
      message.documentId = "";
    }
    if (object.depth !== undefined && object.depth !== null) {
      message.depth = Number(object.depth);
    } else {
      message.depth = 0;
    }
    return message;
  },

  toJSON(message: ListMentionsRequest): unknown {
    const obj: any = {};
    message.documentId !== undefined && (obj.documentId = message.documentId);
    message.depth !== undefined && (obj.depth = message.depth);
    return obj;
  },

  fromPartial(object: DeepPartial<ListMentionsRequest>): ListMentionsRequest {
    const message = { ...baseListMentionsRequest } as ListMentionsRequest;
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = object.documentId;
    } else {
      message.documentId = "";
    }
    if (object.depth !== undefined && object.depth !== null) {
      message.depth = object.depth;
    } else {
      message.depth = 0;
    }
    return message;
  },
};

const baseListMentionsResponse: object = {};

export const ListMentionsResponse = {
  encode(
    message: ListMentionsResponse,
    writer: _m0.Writer = _m0.Writer.create()
  ): _m0.Writer {
    for (const v of message.mentions) {
      Mention.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(
    input: _m0.Reader | Uint8Array,
    length?: number
  ): ListMentionsResponse {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListMentionsResponse } as ListMentionsResponse;
    message.mentions = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.mentions.push(Mention.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ListMentionsResponse {
    const message = { ...baseListMentionsResponse } as ListMentionsResponse;
    message.mentions = [];
    if (object.mentions !== undefined && object.mentions !== null) {
      for (const e of object.mentions) {
        message.mentions.push(Mention.fromJSON(e));
      }
    }
    return message;
  },

  toJSON(message: ListMentionsResponse): unknown {
    const obj: any = {};
    if (message.mentions) {
      obj.mentions = message.mentions.map((e) =>
        e ? Mention.toJSON(e) : undefined
      );
    } else {
      obj.mentions = [];
    }
    return obj;
  },

  fromPartial(object: DeepPartial<ListMentionsResponse>): ListMentionsResponse {
    const message = { ...baseListMentionsResponse } as ListMentionsResponse;
    message.mentions = [];
    if (object.mentions !== undefined && object.mentions !== null) {
      for (const e of object.mentions) {
        message.mentions.push(Mention.fromPartial(e));
      }
    }
    return message;
  },
};

const baseMention: object = {
  targetDocumentId: "",
  targetBlockId: "",
  sourceDocumentId: "",
  sourceBlockId: "",
};

export const Mention = {
  encode(
    message: Mention,
    writer: _m0.Writer = _m0.Writer.create()
  ): _m0.Writer {
    if (message.targetDocumentId !== "") {
      writer.uint32(10).string(message.targetDocumentId);
    }
    if (message.targetBlockId !== "") {
      writer.uint32(18).string(message.targetBlockId);
    }
    if (message.sourceDocumentId !== "") {
      writer.uint32(26).string(message.sourceDocumentId);
    }
    if (message.sourceBlockId !== "") {
      writer.uint32(34).string(message.sourceBlockId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Mention {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseMention } as Mention;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.targetDocumentId = reader.string();
          break;
        case 2:
          message.targetBlockId = reader.string();
          break;
        case 3:
          message.sourceDocumentId = reader.string();
          break;
        case 4:
          message.sourceBlockId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Mention {
    const message = { ...baseMention } as Mention;
    if (
      object.targetDocumentId !== undefined &&
      object.targetDocumentId !== null
    ) {
      message.targetDocumentId = String(object.targetDocumentId);
    } else {
      message.targetDocumentId = "";
    }
    if (object.targetBlockId !== undefined && object.targetBlockId !== null) {
      message.targetBlockId = String(object.targetBlockId);
    } else {
      message.targetBlockId = "";
    }
    if (
      object.sourceDocumentId !== undefined &&
      object.sourceDocumentId !== null
    ) {
      message.sourceDocumentId = String(object.sourceDocumentId);
    } else {
      message.sourceDocumentId = "";
    }
    if (object.sourceBlockId !== undefined && object.sourceBlockId !== null) {
      message.sourceBlockId = String(object.sourceBlockId);
    } else {
      message.sourceBlockId = "";
    }
    return message;
  },

  toJSON(message: Mention): unknown {
    const obj: any = {};
    message.targetDocumentId !== undefined &&
      (obj.targetDocumentId = message.targetDocumentId);
    message.targetBlockId !== undefined &&
      (obj.targetBlockId = message.targetBlockId);
    message.sourceDocumentId !== undefined &&
      (obj.sourceDocumentId = message.sourceDocumentId);
    message.sourceBlockId !== undefined &&
      (obj.sourceBlockId = message.sourceBlockId);
    return obj;
  },

  fromPartial(object: DeepPartial<Mention>): Mention {
    const message = { ...baseMention } as Mention;
    if (
      object.targetDocumentId !== undefined &&
      object.targetDocumentId !== null
    ) {
      message.targetDocumentId = object.targetDocumentId;
    } else {
      message.targetDocumentId = "";
    }
    if (object.targetBlockId !== undefined && object.targetBlockId !== null) {
      message.targetBlockId = object.targetBlockId;
    } else {
      message.targetBlockId = "";
    }
    if (
      object.sourceDocumentId !== undefined &&
      object.sourceDocumentId !== null
    ) {
      message.sourceDocumentId = object.sourceDocumentId;
    } else {
      message.sourceDocumentId = "";
    }
    if (object.sourceBlockId !== undefined && object.sourceBlockId !== null) {
      message.sourceBlockId = object.sourceBlockId;
    } else {
      message.sourceBlockId = "";
    }
    return message;
  },
};

/**
 * Content graph services provides access to mentions (backlinks) of a document.
 * The state of backlinks is inherently local and subjective to each peer.
 */
export interface ContentGraph {
  /** List mentions of a document. */
  listMentions(
    request: DeepPartial<ListMentionsRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListMentionsResponse>;
}

export class ContentGraphClientImpl implements ContentGraph {
  private readonly rpc: Rpc;

  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.listMentions = this.listMentions.bind(this);
  }

  listMentions(
    request: DeepPartial<ListMentionsRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListMentionsResponse> {
    return this.rpc.unary(
      ContentGraphListMentionsDesc,
      ListMentionsRequest.fromPartial(request),
      metadata
    );
  }
}

export const ContentGraphDesc = {
  serviceName: "com.mintter.contentgraph.v1alpha.ContentGraph",
};

export const ContentGraphListMentionsDesc: UnaryMethodDefinitionish = {
  methodName: "ListMentions",
  service: ContentGraphDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ListMentionsRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...ListMentionsResponse.decode(data),
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

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;
type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}
