/* eslint-disable */
//@ts-nocheck
import { util, configure, Writer, Reader } from "protobufjs/minimal";
import * as Long from "long";
import { grpc } from "@improbable-eng/grpc-web";
import { Empty } from "../google/protobuf/empty";
import { BrowserHeaders } from "browser-headers";
import { Timestamp } from "../google/protobuf/timestamp";

export const protobufPackage = "mintter.v2";

/** Publishing state of the document. */
export enum PublishingState {
  DRAFT = 0,
  PUBLISHED = 1,
  UNRECOGNIZED = -1,
}

export function publishingStateFromJSON(object: any): PublishingState {
  switch (object) {
    case 0:
    case "DRAFT":
      return PublishingState.DRAFT;
    case 1:
    case "PUBLISHED":
      return PublishingState.PUBLISHED;
    case -1:
    case "UNRECOGNIZED":
    default:
      return PublishingState.UNRECOGNIZED;
  }
}

export function publishingStateToJSON(object: PublishingState): string {
  switch (object) {
    case PublishingState.DRAFT:
      return "DRAFT";
    case PublishingState.PUBLISHED:
      return "PUBLISHED";
    default:
      return "UNKNOWN";
  }
}

export interface CreateDraftRequest {
  /**
   * Optional. To update an already published document, create a new draft
   * specifying the version of a published version as parent.
   */
  parent: string;
}

/**
 * Request to update an existing draft. The blocks map is optional so that only
 * document can be updated. Although we also want allow to delete all the
 * content if the users selects everything and removes it. For this to work we
 * have a special case of sending a non-nil blockRefList, but with no refs
 * inside.
 */
export interface UpdateDraftRequest {
  /** Required. Full document object. Doesn't support partial updates. */
  document: Document | undefined;
  /**
   * Optional. Set of blocks that belong to this document that has to be updated
   * or added. It's OK to send all the blocks of the document, but as an
   * optimization only the ones that have changed can be sent. Blocks that don't
   * originate from this document (i.e. transclusions) must not be sent here.
   */
  blocks: { [key: string]: Block };
}

export interface UpdateDraftRequest_BlocksEntry {
  key: string;
  value: Block | undefined;
}

export interface UpdateDraftResponse { }

export interface PublishDraftRequest {
  /**
   * Version of the draft to be published. Only drafts can be published.
   * NOTICE: after publishing the draft its version effectively will be
   * forgotten and will be changed to the content-addressable ID. It will be
   * returned in the response to this request.
   */
  version: string;
}

export interface PublishDraftResponse {
  /** Immutable content-addressable version ID for the newly published document. */
  version: string;
}

export interface GetDocumentRequest {
  /**
   * Optional. Globally unique version ID of the document. This is enough to
   * retrieve a published document.
   */
  version: string;
  /**
   * Optional. The ID of the document. Required if version is not specified in
   * which case the currently existing draft (if any) will be returned.
   */
  id: string;
}

export interface GetDocumentResponse {
  /** Document metadata and block layout. */
  document: Document | undefined;
  /**
   * Map of all the blocks needed for this document. It will include local and
   * reused blocks. The key of the map is the block ref as in the BlockRefList.
   */
  blocks: { [key: string]: Block };
}

export interface GetDocumentResponse_BlocksEntry {
  key: string;
  value: Block | undefined;
}

export interface ListDocumentsRequest {
  /**
   * Optional. Used to limit the number of results. The default is up to the
   * server if not specified.
   */
  pageSize: number;
  /** Optional. Used for pagination. */
  pageToken: string;
  /** Optional. Filter by state of the document. */
  publishingState: PublishingState;
  /**
   * Optional. Used to filter the results by author. If empty it
   * will return current user's document.
   */
  author: string;
}

export interface ListDocumentsResponse {
  /**
   * The items in this list will not contain the content itself to make the
   * response more light-weight. The full document with content can be obtain
   * using GetDocument method.
   */
  documents: Document[];
  nextPageToken: string;
}

export interface DeleteDocumentRequest {
  /**
   * Globally unique version of the document to be deleted from the local
   * machine. Documents that were already published and consumed by someone
   * cannot be globally deleted (which is intended).
   */
  version: string;
}

export interface Document {
  /**
   * Required. Globally unique ID of the document. CID of the signed document
   * Permanode (a la Perkeep https://perkeep.org/doc/schema/permanode).
   */
  id: string;
  /** Human-friendly title of the document. */
  title: string;
  /** Subtitle of the document. Can also be a longer description or abstract. */
  subtitle: string;
  /** Output only. ID of the author of the document. */
  author: string;
  /**
   * Output only. Version of the document if it's a published one. For drafts
   * it's empty.
   */
  version: string;
  /** Output only. Previous version of the document if any. */
  parent: string;
  /** Output only. Current state of the document. */
  publishingState: PublishingState;
  /**
   * Nested list of block references according to the document's block
   * hierarchy.
   */
  blockRefList: BlockRefList | undefined;
  /**
   * Output only. Time when the draft of this document was created for the first
   * time.
   */
  createTime: Date | undefined;
  /** Output only. Last time this document was updated. */
  updateTime: Date | undefined;
  /**
   * Output only. Time when this version of the document was published. Empty
   * for drafts.
   */
  publishTime: Date | undefined;
}

/** Nested list of block references. */
export interface BlockRefList {
  /**
   * List style to be used for displaying the blocks in a list. Should only
   * applied to immediate children, not recursively.
   */
  style: BlockRefList_Style;
  /**
   * List of block references, each of which may include other BlockRefList's
   * recursively.
   */
  refs: BlockRef[];
}

export enum BlockRefList_Style {
  NONE = 0,
  BULLET = 1,
  NUMBER = 2,
  UNRECOGNIZED = -1,
}

export function blockRefList_StyleFromJSON(object: any): BlockRefList_Style {
  switch (object) {
    case 0:
    case "NONE":
      return BlockRefList_Style.NONE;
    case 1:
    case "BULLET":
      return BlockRefList_Style.BULLET;
    case 2:
    case "NUMBER":
      return BlockRefList_Style.NUMBER;
    case -1:
    case "UNRECOGNIZED":
    default:
      return BlockRefList_Style.UNRECOGNIZED;
  }
}

export function blockRefList_StyleToJSON(object: BlockRefList_Style): string {
  switch (object) {
    case BlockRefList_Style.NONE:
      return "NONE";
    case BlockRefList_Style.BULLET:
      return "BULLET";
    case BlockRefList_Style.NUMBER:
      return "NUMBER";
    default:
      return "UNKNOWN";
  }
}

/** Block reference. */
export interface BlockRef {
  /**
   * Ref can be one of two forms: just the block ID for local blocks, and
   * <version>/<blockID> for reused blocks.
   */
  ref: string;
  /** Optional. List of children block references. */
  blockRefList: BlockRefList | undefined;
}

/** Block is the main content element of the document. */
export interface Block {
  /** Required. ID of the block that must be unique within its origin document. */
  id: string;
  /** Output only. Sorted list of versions that quote this block. */
  quoters: string[];
  paragraph: Paragraph | undefined;
  image: Image | undefined;
}

/** Text block with its inline elements. */
export interface Paragraph {
  /**
   * Inline elements must be displayed on the same logical line. There must be
   * at least one inline element for a valid paragraph.
   */
  inlineElements: InlineElement[];
}

export interface InlineElement {
  /** Actual †ext of the paragraph. */
  text: string;
  /** Markup to be applied for the inline element. */
  textStyle: TextStyle | undefined;
}

export interface TextStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  code: boolean;
}

export interface Image {
  url: string;
  altText: string;
}

const baseCreateDraftRequest: object = { parent: "" };

export const CreateDraftRequest = {
  encode(
    message: CreateDraftRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.parent !== "") {
      writer.uint32(10).string(message.parent);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): CreateDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseCreateDraftRequest } as CreateDraftRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.parent = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): CreateDraftRequest {
    const message = { ...baseCreateDraftRequest } as CreateDraftRequest;
    if (object.parent !== undefined && object.parent !== null) {
      message.parent = String(object.parent);
    } else {
      message.parent = "";
    }
    return message;
  },

  toJSON(message: CreateDraftRequest): unknown {
    const obj: any = {};
    message.parent !== undefined && (obj.parent = message.parent);
    return obj;
  },

  fromPartial(object: DeepPartial<CreateDraftRequest>): CreateDraftRequest {
    const message = { ...baseCreateDraftRequest } as CreateDraftRequest;
    if (object.parent !== undefined && object.parent !== null) {
      message.parent = object.parent;
    } else {
      message.parent = "";
    }
    return message;
  },
};

const baseUpdateDraftRequest: object = {};

export const UpdateDraftRequest = {
  encode(
    message: UpdateDraftRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.document !== undefined) {
      Document.encode(message.document, writer.uint32(10).fork()).ldelim();
    }
    Object.entries(message.blocks).forEach(([key, value]) => {
      UpdateDraftRequest_BlocksEntry.encode(
        { key: key as any, value },
        writer.uint32(18).fork()
      ).ldelim();
    });
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): UpdateDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseUpdateDraftRequest } as UpdateDraftRequest;
    message.blocks = {};
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.document = Document.decode(reader, reader.uint32());
          break;
        case 2:
          const entry2 = UpdateDraftRequest_BlocksEntry.decode(
            reader,
            reader.uint32()
          );
          if (entry2.value !== undefined) {
            message.blocks[entry2.key] = entry2.value;
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): UpdateDraftRequest {
    const message = { ...baseUpdateDraftRequest } as UpdateDraftRequest;
    message.blocks = {};
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromJSON(object.document);
    } else {
      message.document = undefined;
    }
    if (object.blocks !== undefined && object.blocks !== null) {
      Object.entries(object.blocks).forEach(([key, value]) => {
        message.blocks[key] = Block.fromJSON(value);
      });
    }
    return message;
  },

  toJSON(message: UpdateDraftRequest): unknown {
    const obj: any = {};
    message.document !== undefined &&
      (obj.document = message.document
        ? Document.toJSON(message.document)
        : undefined);
    obj.blocks = {};
    if (message.blocks) {
      Object.entries(message.blocks).forEach(([k, v]) => {
        obj.blocks[k] = Block.toJSON(v);
      });
    }
    return obj;
  },

  fromPartial(object: DeepPartial<UpdateDraftRequest>): UpdateDraftRequest {
    const message = { ...baseUpdateDraftRequest } as UpdateDraftRequest;
    message.blocks = {};
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromPartial(object.document);
    } else {
      message.document = undefined;
    }
    if (object.blocks !== undefined && object.blocks !== null) {
      Object.entries(object.blocks).forEach(([key, value]) => {
        if (value !== undefined) {
          message.blocks[key] = Block.fromPartial(value);
        }
      });
    }
    return message;
  },
};

const baseUpdateDraftRequest_BlocksEntry: object = { key: "" };

export const UpdateDraftRequest_BlocksEntry = {
  encode(
    message: UpdateDraftRequest_BlocksEntry,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      Block.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(
    input: Reader | Uint8Array,
    length?: number
  ): UpdateDraftRequest_BlocksEntry {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = {
      ...baseUpdateDraftRequest_BlocksEntry,
    } as UpdateDraftRequest_BlocksEntry;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.value = Block.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): UpdateDraftRequest_BlocksEntry {
    const message = {
      ...baseUpdateDraftRequest_BlocksEntry,
    } as UpdateDraftRequest_BlocksEntry;
    if (object.key !== undefined && object.key !== null) {
      message.key = String(object.key);
    } else {
      message.key = "";
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Block.fromJSON(object.value);
    } else {
      message.value = undefined;
    }
    return message;
  },

  toJSON(message: UpdateDraftRequest_BlocksEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = message.value ? Block.toJSON(message.value) : undefined);
    return obj;
  },

  fromPartial(
    object: DeepPartial<UpdateDraftRequest_BlocksEntry>
  ): UpdateDraftRequest_BlocksEntry {
    const message = {
      ...baseUpdateDraftRequest_BlocksEntry,
    } as UpdateDraftRequest_BlocksEntry;
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key;
    } else {
      message.key = "";
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Block.fromPartial(object.value);
    } else {
      message.value = undefined;
    }
    return message;
  },
};

const baseUpdateDraftResponse: object = {};

export const UpdateDraftResponse = {
  encode(_: UpdateDraftResponse, writer: Writer = Writer.create()): Writer {
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): UpdateDraftResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseUpdateDraftResponse } as UpdateDraftResponse;
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

  fromJSON(_: any): UpdateDraftResponse {
    const message = { ...baseUpdateDraftResponse } as UpdateDraftResponse;
    return message;
  },

  toJSON(_: UpdateDraftResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(_: DeepPartial<UpdateDraftResponse>): UpdateDraftResponse {
    const message = { ...baseUpdateDraftResponse } as UpdateDraftResponse;
    return message;
  },
};

const basePublishDraftRequest: object = { version: "" };

export const PublishDraftRequest = {
  encode(
    message: PublishDraftRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): PublishDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...basePublishDraftRequest } as PublishDraftRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PublishDraftRequest {
    const message = { ...basePublishDraftRequest } as PublishDraftRequest;
    if (object.version !== undefined && object.version !== null) {
      message.version = String(object.version);
    } else {
      message.version = "";
    }
    return message;
  },

  toJSON(message: PublishDraftRequest): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },

  fromPartial(object: DeepPartial<PublishDraftRequest>): PublishDraftRequest {
    const message = { ...basePublishDraftRequest } as PublishDraftRequest;
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version;
    } else {
      message.version = "";
    }
    return message;
  },
};

const basePublishDraftResponse: object = { version: "" };

export const PublishDraftResponse = {
  encode(
    message: PublishDraftResponse,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): PublishDraftResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...basePublishDraftResponse } as PublishDraftResponse;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): PublishDraftResponse {
    const message = { ...basePublishDraftResponse } as PublishDraftResponse;
    if (object.version !== undefined && object.version !== null) {
      message.version = String(object.version);
    } else {
      message.version = "";
    }
    return message;
  },

  toJSON(message: PublishDraftResponse): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },

  fromPartial(object: DeepPartial<PublishDraftResponse>): PublishDraftResponse {
    const message = { ...basePublishDraftResponse } as PublishDraftResponse;
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version;
    } else {
      message.version = "";
    }
    return message;
  },
};

const baseGetDocumentRequest: object = { version: "", id: "" };

export const GetDocumentRequest = {
  encode(
    message: GetDocumentRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    if (message.id !== "") {
      writer.uint32(18).string(message.id);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): GetDocumentRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseGetDocumentRequest } as GetDocumentRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string();
          break;
        case 2:
          message.id = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): GetDocumentRequest {
    const message = { ...baseGetDocumentRequest } as GetDocumentRequest;
    if (object.version !== undefined && object.version !== null) {
      message.version = String(object.version);
    } else {
      message.version = "";
    }
    if (object.id !== undefined && object.id !== null) {
      message.id = String(object.id);
    } else {
      message.id = "";
    }
    return message;
  },

  toJSON(message: GetDocumentRequest): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  fromPartial(object: DeepPartial<GetDocumentRequest>): GetDocumentRequest {
    const message = { ...baseGetDocumentRequest } as GetDocumentRequest;
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version;
    } else {
      message.version = "";
    }
    if (object.id !== undefined && object.id !== null) {
      message.id = object.id;
    } else {
      message.id = "";
    }
    return message;
  },
};

const baseGetDocumentResponse: object = {};

export const GetDocumentResponse = {
  encode(
    message: GetDocumentResponse,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.document !== undefined) {
      Document.encode(message.document, writer.uint32(10).fork()).ldelim();
    }
    Object.entries(message.blocks).forEach(([key, value]) => {
      GetDocumentResponse_BlocksEntry.encode(
        { key: key as any, value },
        writer.uint32(18).fork()
      ).ldelim();
    });
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): GetDocumentResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseGetDocumentResponse } as GetDocumentResponse;
    message.blocks = {};
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.document = Document.decode(reader, reader.uint32());
          break;
        case 2:
          const entry2 = GetDocumentResponse_BlocksEntry.decode(
            reader,
            reader.uint32()
          );
          if (entry2.value !== undefined) {
            message.blocks[entry2.key] = entry2.value;
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): GetDocumentResponse {
    const message = { ...baseGetDocumentResponse } as GetDocumentResponse;
    message.blocks = {};
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromJSON(object.document);
    } else {
      message.document = undefined;
    }
    if (object.blocks !== undefined && object.blocks !== null) {
      Object.entries(object.blocks).forEach(([key, value]) => {
        message.blocks[key] = Block.fromJSON(value);
      });
    }
    return message;
  },

  toJSON(message: GetDocumentResponse): unknown {
    const obj: any = {};
    message.document !== undefined &&
      (obj.document = message.document
        ? Document.toJSON(message.document)
        : undefined);
    obj.blocks = {};
    if (message.blocks) {
      Object.entries(message.blocks).forEach(([k, v]) => {
        obj.blocks[k] = Block.toJSON(v);
      });
    }
    return obj;
  },

  fromPartial(object: DeepPartial<GetDocumentResponse>): GetDocumentResponse {
    const message = { ...baseGetDocumentResponse } as GetDocumentResponse;
    message.blocks = {};
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromPartial(object.document);
    } else {
      message.document = undefined;
    }
    if (object.blocks !== undefined && object.blocks !== null) {
      Object.entries(object.blocks).forEach(([key, value]) => {
        if (value !== undefined) {
          message.blocks[key] = Block.fromPartial(value);
        }
      });
    }
    return message;
  },
};

const baseGetDocumentResponse_BlocksEntry: object = { key: "" };

export const GetDocumentResponse_BlocksEntry = {
  encode(
    message: GetDocumentResponse_BlocksEntry,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      Block.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(
    input: Reader | Uint8Array,
    length?: number
  ): GetDocumentResponse_BlocksEntry {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = {
      ...baseGetDocumentResponse_BlocksEntry,
    } as GetDocumentResponse_BlocksEntry;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.value = Block.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): GetDocumentResponse_BlocksEntry {
    const message = {
      ...baseGetDocumentResponse_BlocksEntry,
    } as GetDocumentResponse_BlocksEntry;
    if (object.key !== undefined && object.key !== null) {
      message.key = String(object.key);
    } else {
      message.key = "";
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Block.fromJSON(object.value);
    } else {
      message.value = undefined;
    }
    return message;
  },

  toJSON(message: GetDocumentResponse_BlocksEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = message.value ? Block.toJSON(message.value) : undefined);
    return obj;
  },

  fromPartial(
    object: DeepPartial<GetDocumentResponse_BlocksEntry>
  ): GetDocumentResponse_BlocksEntry {
    const message = {
      ...baseGetDocumentResponse_BlocksEntry,
    } as GetDocumentResponse_BlocksEntry;
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key;
    } else {
      message.key = "";
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Block.fromPartial(object.value);
    } else {
      message.value = undefined;
    }
    return message;
  },
};

const baseListDocumentsRequest: object = {
  pageSize: 0,
  pageToken: "",
  publishingState: 0,
  author: "",
};

export const ListDocumentsRequest = {
  encode(
    message: ListDocumentsRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.pageSize !== 0) {
      writer.uint32(8).int32(message.pageSize);
    }
    if (message.pageToken !== "") {
      writer.uint32(18).string(message.pageToken);
    }
    if (message.publishingState !== 0) {
      writer.uint32(24).int32(message.publishingState);
    }
    if (message.author !== "") {
      writer.uint32(34).string(message.author);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): ListDocumentsRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListDocumentsRequest } as ListDocumentsRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pageSize = reader.int32();
          break;
        case 2:
          message.pageToken = reader.string();
          break;
        case 3:
          message.publishingState = reader.int32() as any;
          break;
        case 4:
          message.author = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ListDocumentsRequest {
    const message = { ...baseListDocumentsRequest } as ListDocumentsRequest;
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
    if (
      object.publishingState !== undefined &&
      object.publishingState !== null
    ) {
      message.publishingState = publishingStateFromJSON(object.publishingState);
    } else {
      message.publishingState = 0;
    }
    if (object.author !== undefined && object.author !== null) {
      message.author = String(object.author);
    } else {
      message.author = "";
    }
    return message;
  },

  toJSON(message: ListDocumentsRequest): unknown {
    const obj: any = {};
    message.pageSize !== undefined && (obj.pageSize = message.pageSize);
    message.pageToken !== undefined && (obj.pageToken = message.pageToken);
    message.publishingState !== undefined &&
      (obj.publishingState = publishingStateToJSON(message.publishingState));
    message.author !== undefined && (obj.author = message.author);
    return obj;
  },

  fromPartial(object: DeepPartial<ListDocumentsRequest>): ListDocumentsRequest {
    const message = { ...baseListDocumentsRequest } as ListDocumentsRequest;
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
    if (
      object.publishingState !== undefined &&
      object.publishingState !== null
    ) {
      message.publishingState = object.publishingState;
    } else {
      message.publishingState = 0;
    }
    if (object.author !== undefined && object.author !== null) {
      message.author = object.author;
    } else {
      message.author = "";
    }
    return message;
  },
};

const baseListDocumentsResponse: object = { nextPageToken: "" };

export const ListDocumentsResponse = {
  encode(
    message: ListDocumentsResponse,
    writer: Writer = Writer.create()
  ): Writer {
    for (const v of message.documents) {
      Document.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.nextPageToken !== "") {
      writer.uint32(18).string(message.nextPageToken);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): ListDocumentsResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListDocumentsResponse } as ListDocumentsResponse;
    message.documents = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.documents.push(Document.decode(reader, reader.uint32()));
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

  fromJSON(object: any): ListDocumentsResponse {
    const message = { ...baseListDocumentsResponse } as ListDocumentsResponse;
    message.documents = [];
    if (object.documents !== undefined && object.documents !== null) {
      for (const e of object.documents) {
        message.documents.push(Document.fromJSON(e));
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = String(object.nextPageToken);
    } else {
      message.nextPageToken = "";
    }
    return message;
  },

  toJSON(message: ListDocumentsResponse): unknown {
    const obj: any = {};
    if (message.documents) {
      obj.documents = message.documents.map((e) =>
        e ? Document.toJSON(e) : undefined
      );
    } else {
      obj.documents = [];
    }
    message.nextPageToken !== undefined &&
      (obj.nextPageToken = message.nextPageToken);
    return obj;
  },

  fromPartial(
    object: DeepPartial<ListDocumentsResponse>
  ): ListDocumentsResponse {
    const message = { ...baseListDocumentsResponse } as ListDocumentsResponse;
    message.documents = [];
    if (object.documents !== undefined && object.documents !== null) {
      for (const e of object.documents) {
        message.documents.push(Document.fromPartial(e));
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

const baseDeleteDocumentRequest: object = { version: "" };

export const DeleteDocumentRequest = {
  encode(
    message: DeleteDocumentRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): DeleteDocumentRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseDeleteDocumentRequest } as DeleteDocumentRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): DeleteDocumentRequest {
    const message = { ...baseDeleteDocumentRequest } as DeleteDocumentRequest;
    if (object.version !== undefined && object.version !== null) {
      message.version = String(object.version);
    } else {
      message.version = "";
    }
    return message;
  },

  toJSON(message: DeleteDocumentRequest): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },

  fromPartial(
    object: DeepPartial<DeleteDocumentRequest>
  ): DeleteDocumentRequest {
    const message = { ...baseDeleteDocumentRequest } as DeleteDocumentRequest;
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version;
    } else {
      message.version = "";
    }
    return message;
  },
};

const baseDocument: object = {
  id: "",
  title: "",
  subtitle: "",
  author: "",
  version: "",
  parent: "",
  publishingState: 0,
};

export const Document = {
  encode(message: Document, writer: Writer = Writer.create()): Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.title !== "") {
      writer.uint32(18).string(message.title);
    }
    if (message.subtitle !== "") {
      writer.uint32(26).string(message.subtitle);
    }
    if (message.author !== "") {
      writer.uint32(34).string(message.author);
    }
    if (message.version !== "") {
      writer.uint32(42).string(message.version);
    }
    if (message.parent !== "") {
      writer.uint32(50).string(message.parent);
    }
    if (message.publishingState !== 0) {
      writer.uint32(56).int32(message.publishingState);
    }
    if (message.blockRefList !== undefined) {
      BlockRefList.encode(
        message.blockRefList,
        writer.uint32(66).fork()
      ).ldelim();
    }
    if (message.createTime !== undefined) {
      Timestamp.encode(
        toTimestamp(message.createTime),
        writer.uint32(74).fork()
      ).ldelim();
    }
    if (message.updateTime !== undefined) {
      Timestamp.encode(
        toTimestamp(message.updateTime),
        writer.uint32(82).fork()
      ).ldelim();
    }
    if (message.publishTime !== undefined) {
      Timestamp.encode(
        toTimestamp(message.publishTime),
        writer.uint32(90).fork()
      ).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Document {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseDocument } as Document;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 2:
          message.title = reader.string();
          break;
        case 3:
          message.subtitle = reader.string();
          break;
        case 4:
          message.author = reader.string();
          break;
        case 5:
          message.version = reader.string();
          break;
        case 6:
          message.parent = reader.string();
          break;
        case 7:
          message.publishingState = reader.int32() as any;
          break;
        case 8:
          message.blockRefList = BlockRefList.decode(reader, reader.uint32());
          break;
        case 9:
          message.createTime = fromTimestamp(
            Timestamp.decode(reader, reader.uint32())
          );
          break;
        case 10:
          message.updateTime = fromTimestamp(
            Timestamp.decode(reader, reader.uint32())
          );
          break;
        case 11:
          message.publishTime = fromTimestamp(
            Timestamp.decode(reader, reader.uint32())
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Document {
    const message = { ...baseDocument } as Document;
    if (object.id !== undefined && object.id !== null) {
      message.id = String(object.id);
    } else {
      message.id = "";
    }
    if (object.title !== undefined && object.title !== null) {
      message.title = String(object.title);
    } else {
      message.title = "";
    }
    if (object.subtitle !== undefined && object.subtitle !== null) {
      message.subtitle = String(object.subtitle);
    } else {
      message.subtitle = "";
    }
    if (object.author !== undefined && object.author !== null) {
      message.author = String(object.author);
    } else {
      message.author = "";
    }
    if (object.version !== undefined && object.version !== null) {
      message.version = String(object.version);
    } else {
      message.version = "";
    }
    if (object.parent !== undefined && object.parent !== null) {
      message.parent = String(object.parent);
    } else {
      message.parent = "";
    }
    if (
      object.publishingState !== undefined &&
      object.publishingState !== null
    ) {
      message.publishingState = publishingStateFromJSON(object.publishingState);
    } else {
      message.publishingState = 0;
    }
    if (object.blockRefList !== undefined && object.blockRefList !== null) {
      message.blockRefList = BlockRefList.fromJSON(object.blockRefList);
    } else {
      message.blockRefList = undefined;
    }
    if (object.createTime !== undefined && object.createTime !== null) {
      message.createTime = fromJsonTimestamp(object.createTime);
    } else {
      message.createTime = undefined;
    }
    if (object.updateTime !== undefined && object.updateTime !== null) {
      message.updateTime = fromJsonTimestamp(object.updateTime);
    } else {
      message.updateTime = undefined;
    }
    if (object.publishTime !== undefined && object.publishTime !== null) {
      message.publishTime = fromJsonTimestamp(object.publishTime);
    } else {
      message.publishTime = undefined;
    }
    return message;
  },

  toJSON(message: Document): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.title !== undefined && (obj.title = message.title);
    message.subtitle !== undefined && (obj.subtitle = message.subtitle);
    message.author !== undefined && (obj.author = message.author);
    message.version !== undefined && (obj.version = message.version);
    message.parent !== undefined && (obj.parent = message.parent);
    message.publishingState !== undefined &&
      (obj.publishingState = publishingStateToJSON(message.publishingState));
    message.blockRefList !== undefined &&
      (obj.blockRefList = message.blockRefList
        ? BlockRefList.toJSON(message.blockRefList)
        : undefined);
    message.createTime !== undefined &&
      (obj.createTime = message.createTime.toISOString());
    message.updateTime !== undefined &&
      (obj.updateTime = message.updateTime.toISOString());
    message.publishTime !== undefined &&
      (obj.publishTime = message.publishTime.toISOString());
    return obj;
  },

  fromPartial(object: DeepPartial<Document>): Document {
    const message = { ...baseDocument } as Document;
    if (object.id !== undefined && object.id !== null) {
      message.id = object.id;
    } else {
      message.id = "";
    }
    if (object.title !== undefined && object.title !== null) {
      message.title = object.title;
    } else {
      message.title = "";
    }
    if (object.subtitle !== undefined && object.subtitle !== null) {
      message.subtitle = object.subtitle;
    } else {
      message.subtitle = "";
    }
    if (object.author !== undefined && object.author !== null) {
      message.author = object.author;
    } else {
      message.author = "";
    }
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version;
    } else {
      message.version = "";
    }
    if (object.parent !== undefined && object.parent !== null) {
      message.parent = object.parent;
    } else {
      message.parent = "";
    }
    if (
      object.publishingState !== undefined &&
      object.publishingState !== null
    ) {
      message.publishingState = object.publishingState;
    } else {
      message.publishingState = 0;
    }
    if (object.blockRefList !== undefined && object.blockRefList !== null) {
      message.blockRefList = BlockRefList.fromPartial(object.blockRefList);
    } else {
      message.blockRefList = undefined;
    }
    if (object.createTime !== undefined && object.createTime !== null) {
      message.createTime = object.createTime;
    } else {
      message.createTime = undefined;
    }
    if (object.updateTime !== undefined && object.updateTime !== null) {
      message.updateTime = object.updateTime;
    } else {
      message.updateTime = undefined;
    }
    if (object.publishTime !== undefined && object.publishTime !== null) {
      message.publishTime = object.publishTime;
    } else {
      message.publishTime = undefined;
    }
    return message;
  },
};

const baseBlockRefList: object = { style: 0 };

export const BlockRefList = {
  encode(message: BlockRefList, writer: Writer = Writer.create()): Writer {
    if (message.style !== 0) {
      writer.uint32(8).int32(message.style);
    }
    for (const v of message.refs) {
      BlockRef.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): BlockRefList {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseBlockRefList } as BlockRefList;
    message.refs = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.style = reader.int32() as any;
          break;
        case 2:
          message.refs.push(BlockRef.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): BlockRefList {
    const message = { ...baseBlockRefList } as BlockRefList;
    message.refs = [];
    if (object.style !== undefined && object.style !== null) {
      message.style = blockRefList_StyleFromJSON(object.style);
    } else {
      message.style = 0;
    }
    if (object.refs !== undefined && object.refs !== null) {
      for (const e of object.refs) {
        message.refs.push(BlockRef.fromJSON(e));
      }
    }
    return message;
  },

  toJSON(message: BlockRefList): unknown {
    const obj: any = {};
    message.style !== undefined &&
      (obj.style = blockRefList_StyleToJSON(message.style));
    if (message.refs) {
      obj.refs = message.refs.map((e) => (e ? BlockRef.toJSON(e) : undefined));
    } else {
      obj.refs = [];
    }
    return obj;
  },

  fromPartial(object: DeepPartial<BlockRefList>): BlockRefList {
    const message = { ...baseBlockRefList } as BlockRefList;
    message.refs = [];
    if (object.style !== undefined && object.style !== null) {
      message.style = object.style;
    } else {
      message.style = 0;
    }
    if (object.refs !== undefined && object.refs !== null) {
      for (const e of object.refs) {
        message.refs.push(BlockRef.fromPartial(e));
      }
    }
    return message;
  },
};

const baseBlockRef: object = { ref: "" };

export const BlockRef = {
  encode(message: BlockRef, writer: Writer = Writer.create()): Writer {
    if (message.ref !== "") {
      writer.uint32(10).string(message.ref);
    }
    if (message.blockRefList !== undefined) {
      BlockRefList.encode(
        message.blockRefList,
        writer.uint32(18).fork()
      ).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): BlockRef {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseBlockRef } as BlockRef;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ref = reader.string();
          break;
        case 2:
          message.blockRefList = BlockRefList.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): BlockRef {
    const message = { ...baseBlockRef } as BlockRef;
    if (object.ref !== undefined && object.ref !== null) {
      message.ref = String(object.ref);
    } else {
      message.ref = "";
    }
    if (object.blockRefList !== undefined && object.blockRefList !== null) {
      message.blockRefList = BlockRefList.fromJSON(object.blockRefList);
    } else {
      message.blockRefList = undefined;
    }
    return message;
  },

  toJSON(message: BlockRef): unknown {
    const obj: any = {};
    message.ref !== undefined && (obj.ref = message.ref);
    message.blockRefList !== undefined &&
      (obj.blockRefList = message.blockRefList
        ? BlockRefList.toJSON(message.blockRefList)
        : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<BlockRef>): BlockRef {
    const message = { ...baseBlockRef } as BlockRef;
    if (object.ref !== undefined && object.ref !== null) {
      message.ref = object.ref;
    } else {
      message.ref = "";
    }
    if (object.blockRefList !== undefined && object.blockRefList !== null) {
      message.blockRefList = BlockRefList.fromPartial(object.blockRefList);
    } else {
      message.blockRefList = undefined;
    }
    return message;
  },
};

const baseBlock: object = { id: "", quoters: "" };

export const Block = {
  encode(message: Block, writer: Writer = Writer.create()): Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    for (const v of message.quoters) {
      writer.uint32(18).string(v!);
    }
    if (message.paragraph !== undefined) {
      Paragraph.encode(message.paragraph, writer.uint32(26).fork()).ldelim();
    }
    if (message.image !== undefined) {
      Image.encode(message.image, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Block {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseBlock } as Block;
    message.quoters = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 2:
          message.quoters.push(reader.string());
          break;
        case 3:
          message.paragraph = Paragraph.decode(reader, reader.uint32());
          break;
        case 4:
          message.image = Image.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Block {
    const message = { ...baseBlock } as Block;
    message.quoters = [];
    if (object.id !== undefined && object.id !== null) {
      message.id = String(object.id);
    } else {
      message.id = "";
    }
    if (object.quoters !== undefined && object.quoters !== null) {
      for (const e of object.quoters) {
        message.quoters.push(String(e));
      }
    }
    if (object.paragraph !== undefined && object.paragraph !== null) {
      message.paragraph = Paragraph.fromJSON(object.paragraph);
    } else {
      message.paragraph = undefined;
    }
    if (object.image !== undefined && object.image !== null) {
      message.image = Image.fromJSON(object.image);
    } else {
      message.image = undefined;
    }
    return message;
  },

  toJSON(message: Block): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    if (message.quoters) {
      obj.quoters = message.quoters.map((e) => e);
    } else {
      obj.quoters = [];
    }
    message.paragraph !== undefined &&
      (obj.paragraph = message.paragraph
        ? Paragraph.toJSON(message.paragraph)
        : undefined);
    message.image !== undefined &&
      (obj.image = message.image ? Image.toJSON(message.image) : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<Block>): Block {
    const message = { ...baseBlock } as Block;
    message.quoters = [];
    if (object.id !== undefined && object.id !== null) {
      message.id = object.id;
    } else {
      message.id = "";
    }
    if (object.quoters !== undefined && object.quoters !== null) {
      for (const e of object.quoters) {
        message.quoters.push(e);
      }
    }
    if (object.paragraph !== undefined && object.paragraph !== null) {
      message.paragraph = Paragraph.fromPartial(object.paragraph);
    } else {
      message.paragraph = undefined;
    }
    if (object.image !== undefined && object.image !== null) {
      message.image = Image.fromPartial(object.image);
    } else {
      message.image = undefined;
    }
    return message;
  },
};

const baseParagraph: object = {};

export const Paragraph = {
  encode(message: Paragraph, writer: Writer = Writer.create()): Writer {
    for (const v of message.inlineElements) {
      InlineElement.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Paragraph {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseParagraph } as Paragraph;
    message.inlineElements = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.inlineElements.push(
            InlineElement.decode(reader, reader.uint32())
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Paragraph {
    const message = { ...baseParagraph } as Paragraph;
    message.inlineElements = [];
    if (object.inlineElements !== undefined && object.inlineElements !== null) {
      for (const e of object.inlineElements) {
        message.inlineElements.push(InlineElement.fromJSON(e));
      }
    }
    return message;
  },

  toJSON(message: Paragraph): unknown {
    const obj: any = {};
    if (message.inlineElements) {
      obj.inlineElements = message.inlineElements.map((e) =>
        e ? InlineElement.toJSON(e) : undefined
      );
    } else {
      obj.inlineElements = [];
    }
    return obj;
  },

  fromPartial(object: DeepPartial<Paragraph>): Paragraph {
    const message = { ...baseParagraph } as Paragraph;
    message.inlineElements = [];
    if (object.inlineElements !== undefined && object.inlineElements !== null) {
      for (const e of object.inlineElements) {
        message.inlineElements.push(InlineElement.fromPartial(e));
      }
    }
    return message;
  },
};

const baseInlineElement: object = { text: "" };

export const InlineElement = {
  encode(message: InlineElement, writer: Writer = Writer.create()): Writer {
    if (message.text !== "") {
      writer.uint32(10).string(message.text);
    }
    if (message.textStyle !== undefined) {
      TextStyle.encode(message.textStyle, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): InlineElement {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseInlineElement } as InlineElement;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.text = reader.string();
          break;
        case 2:
          message.textStyle = TextStyle.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): InlineElement {
    const message = { ...baseInlineElement } as InlineElement;
    if (object.text !== undefined && object.text !== null) {
      message.text = String(object.text);
    } else {
      message.text = "";
    }
    if (object.textStyle !== undefined && object.textStyle !== null) {
      message.textStyle = TextStyle.fromJSON(object.textStyle);
    } else {
      message.textStyle = undefined;
    }
    return message;
  },

  toJSON(message: InlineElement): unknown {
    const obj: any = {};
    message.text !== undefined && (obj.text = message.text);
    message.textStyle !== undefined &&
      (obj.textStyle = message.textStyle
        ? TextStyle.toJSON(message.textStyle)
        : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<InlineElement>): InlineElement {
    const message = { ...baseInlineElement } as InlineElement;
    if (object.text !== undefined && object.text !== null) {
      message.text = object.text;
    } else {
      message.text = "";
    }
    if (object.textStyle !== undefined && object.textStyle !== null) {
      message.textStyle = TextStyle.fromPartial(object.textStyle);
    } else {
      message.textStyle = undefined;
    }
    return message;
  },
};

const baseTextStyle: object = {
  bold: false,
  italic: false,
  underline: false,
  code: false,
};

export const TextStyle = {
  encode(message: TextStyle, writer: Writer = Writer.create()): Writer {
    if (message.bold === true) {
      writer.uint32(8).bool(message.bold);
    }
    if (message.italic === true) {
      writer.uint32(16).bool(message.italic);
    }
    if (message.underline === true) {
      writer.uint32(24).bool(message.underline);
    }
    if (message.code === true) {
      writer.uint32(32).bool(message.code);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): TextStyle {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseTextStyle } as TextStyle;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.bold = reader.bool();
          break;
        case 2:
          message.italic = reader.bool();
          break;
        case 3:
          message.underline = reader.bool();
          break;
        case 4:
          message.code = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): TextStyle {
    const message = { ...baseTextStyle } as TextStyle;
    if (object.bold !== undefined && object.bold !== null) {
      message.bold = Boolean(object.bold);
    } else {
      message.bold = false;
    }
    if (object.italic !== undefined && object.italic !== null) {
      message.italic = Boolean(object.italic);
    } else {
      message.italic = false;
    }
    if (object.underline !== undefined && object.underline !== null) {
      message.underline = Boolean(object.underline);
    } else {
      message.underline = false;
    }
    if (object.code !== undefined && object.code !== null) {
      message.code = Boolean(object.code);
    } else {
      message.code = false;
    }
    return message;
  },

  toJSON(message: TextStyle): unknown {
    const obj: any = {};
    message.bold !== undefined && (obj.bold = message.bold);
    message.italic !== undefined && (obj.italic = message.italic);
    message.underline !== undefined && (obj.underline = message.underline);
    message.code !== undefined && (obj.code = message.code);
    return obj;
  },

  fromPartial(object: DeepPartial<TextStyle>): TextStyle {
    const message = { ...baseTextStyle } as TextStyle;
    if (object.bold !== undefined && object.bold !== null) {
      message.bold = object.bold;
    } else {
      message.bold = false;
    }
    if (object.italic !== undefined && object.italic !== null) {
      message.italic = object.italic;
    } else {
      message.italic = false;
    }
    if (object.underline !== undefined && object.underline !== null) {
      message.underline = object.underline;
    } else {
      message.underline = false;
    }
    if (object.code !== undefined && object.code !== null) {
      message.code = object.code;
    } else {
      message.code = false;
    }
    return message;
  },
};

const baseImage: object = { url: "", altText: "" };

export const Image = {
  encode(message: Image, writer: Writer = Writer.create()): Writer {
    if (message.url !== "") {
      writer.uint32(10).string(message.url);
    }
    if (message.altText !== "") {
      writer.uint32(18).string(message.altText);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Image {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseImage } as Image;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.url = reader.string();
          break;
        case 2:
          message.altText = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Image {
    const message = { ...baseImage } as Image;
    if (object.url !== undefined && object.url !== null) {
      message.url = String(object.url);
    } else {
      message.url = "";
    }
    if (object.altText !== undefined && object.altText !== null) {
      message.altText = String(object.altText);
    } else {
      message.altText = "";
    }
    return message;
  },

  toJSON(message: Image): unknown {
    const obj: any = {};
    message.url !== undefined && (obj.url = message.url);
    message.altText !== undefined && (obj.altText = message.altText);
    return obj;
  },

  fromPartial(object: DeepPartial<Image>): Image {
    const message = { ...baseImage } as Image;
    if (object.url !== undefined && object.url !== null) {
      message.url = object.url;
    } else {
      message.url = "";
    }
    if (object.altText !== undefined && object.altText !== null) {
      message.altText = object.altText;
    } else {
      message.altText = "";
    }
    return message;
  },
};

export interface Documents {
  createDraft(
    request: DeepPartial<CreateDraftRequest>,
    metadata?: grpc.Metadata
  ): Promise<Document>;
  updateDraft(
    request: DeepPartial<UpdateDraftRequest>,
    metadata?: grpc.Metadata
  ): Promise<UpdateDraftResponse>;
  publishDraft(
    request: DeepPartial<PublishDraftRequest>,
    metadata?: grpc.Metadata
  ): Promise<PublishDraftResponse>;
  getDocument(
    request: DeepPartial<GetDocumentRequest>,
    metadata?: grpc.Metadata
  ): Promise<GetDocumentResponse>;
  listDocuments(
    request: DeepPartial<ListDocumentsRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListDocumentsResponse>;
  deleteDocument(
    request: DeepPartial<DeleteDocumentRequest>,
    metadata?: grpc.Metadata
  ): Promise<Empty>;
}

export class DocumentsClientImpl implements Documents {
  private readonly rpc: Rpc;

  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.CreateDraft = this.CreateDraft.bind(this);
    this.UpdateDraft = this.UpdateDraft.bind(this);
    this.PublishDraft = this.PublishDraft.bind(this);
    this.GetDocument = this.GetDocument.bind(this);
    this.ListDocuments = this.ListDocuments.bind(this);
    this.DeleteDocument = this.DeleteDocument.bind(this);
  }

  CreateDraft(
    request: DeepPartial<CreateDraftRequest>,
    metadata?: grpc.Metadata
  ): Promise<Document> {
    return this.rpc.unary(
      DocumentsCreateDraftDesc,
      CreateDraftRequest.fromPartial(request),
      metadata
    );
  }

  UpdateDraft(
    request: DeepPartial<UpdateDraftRequest>,
    metadata?: grpc.Metadata
  ): Promise<UpdateDraftResponse> {
    return this.rpc.unary(
      DocumentsUpdateDraftDesc,
      UpdateDraftRequest.fromPartial(request),
      metadata
    );
  }

  PublishDraft(
    request: DeepPartial<PublishDraftRequest>,
    metadata?: grpc.Metadata
  ): Promise<PublishDraftResponse> {
    return this.rpc.unary(
      DocumentsPublishDraftDesc,
      PublishDraftRequest.fromPartial(request),
      metadata
    );
  }

  GetDocument(
    request: DeepPartial<GetDocumentRequest>,
    metadata?: grpc.Metadata
  ): Promise<GetDocumentResponse> {
    return this.rpc.unary(
      DocumentsGetDocumentDesc,
      GetDocumentRequest.fromPartial(request),
      metadata
    );
  }

  ListDocuments(
    request: DeepPartial<ListDocumentsRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListDocumentsResponse> {
    return this.rpc.unary(
      DocumentsListDocumentsDesc,
      ListDocumentsRequest.fromPartial(request),
      metadata
    );
  }

  DeleteDocument(
    request: DeepPartial<DeleteDocumentRequest>,
    metadata?: grpc.Metadata
  ): Promise<Empty> {
    return this.rpc.unary(
      DocumentsDeleteDocumentDesc,
      DeleteDocumentRequest.fromPartial(request),
      metadata
    );
  }
}

export const DocumentsDesc = {
  serviceName: "mintter.v2.Documents",
};

export const DocumentsCreateDraftDesc: UnaryMethodDefinitionish = {
  methodName: "CreateDraft",
  service: DocumentsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return CreateDraftRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Document.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const DocumentsUpdateDraftDesc: UnaryMethodDefinitionish = {
  methodName: "UpdateDraft",
  service: DocumentsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return UpdateDraftRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...UpdateDraftResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const DocumentsPublishDraftDesc: UnaryMethodDefinitionish = {
  methodName: "PublishDraft",
  service: DocumentsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return PublishDraftRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...PublishDraftResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const DocumentsGetDocumentDesc: UnaryMethodDefinitionish = {
  methodName: "GetDocument",
  service: DocumentsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GetDocumentRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...GetDocumentResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const DocumentsListDocumentsDesc: UnaryMethodDefinitionish = {
  methodName: "ListDocuments",
  service: DocumentsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ListDocumentsRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...ListDocumentsResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const DocumentsDeleteDocumentDesc: UnaryMethodDefinitionish = {
  methodName: "DeleteDocument",
  service: DocumentsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return DeleteDocumentRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Empty.decode(data),
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
export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function toTimestamp(date: Date): Timestamp {
  const seconds = date.getTime() / 1_000;
  const nanos = (date.getTime() % 1_000) * 1_000_000;
  return { seconds, nanos };
}

function fromTimestamp(t: Timestamp): Date {
  let millis = t.seconds * 1_000;
  millis += t.nanos / 1_000_000;
  return new Date(millis);
}

function fromJsonTimestamp(o: any): Date {
  if (o instanceof Date) {
    return o;
  } else if (typeof o === "string") {
    return new Date(o);
  } else {
    return fromTimestamp(Timestamp.fromJSON(o));
  }
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
  util.Long = Long as any;
  configure();
}
