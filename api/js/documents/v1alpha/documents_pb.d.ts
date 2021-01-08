import * as jspb from "google-protobuf"

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';
import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb';

export class CreateDraftRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateDraftRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateDraftRequest): CreateDraftRequest.AsObject;
  static serializeBinaryToWriter(message: CreateDraftRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateDraftRequest;
  static deserializeBinaryFromReader(message: CreateDraftRequest, reader: jspb.BinaryReader): CreateDraftRequest;
}

export namespace CreateDraftRequest {
  export type AsObject = {
  }
}

export class DeleteDraftRequest extends jspb.Message {
  getDocumentId(): string;
  setDocumentId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteDraftRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteDraftRequest): DeleteDraftRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteDraftRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteDraftRequest;
  static deserializeBinaryFromReader(message: DeleteDraftRequest, reader: jspb.BinaryReader): DeleteDraftRequest;
}

export namespace DeleteDraftRequest {
  export type AsObject = {
    documentId: string,
  }
}

export class GetDraftRequest extends jspb.Message {
  getDocumentId(): string;
  setDocumentId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetDraftRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetDraftRequest): GetDraftRequest.AsObject;
  static serializeBinaryToWriter(message: GetDraftRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetDraftRequest;
  static deserializeBinaryFromReader(message: GetDraftRequest, reader: jspb.BinaryReader): GetDraftRequest;
}

export namespace GetDraftRequest {
  export type AsObject = {
    documentId: string,
  }
}

export class UpdateDraftRequest extends jspb.Message {
  getDocument(): Document | undefined;
  setDocument(value?: Document): void;
  hasDocument(): boolean;
  clearDocument(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateDraftRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateDraftRequest): UpdateDraftRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateDraftRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateDraftRequest;
  static deserializeBinaryFromReader(message: UpdateDraftRequest, reader: jspb.BinaryReader): UpdateDraftRequest;
}

export namespace UpdateDraftRequest {
  export type AsObject = {
    document?: Document.AsObject,
  }
}

export class ListDraftsRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): void;

  getPageToken(): string;
  setPageToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListDraftsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListDraftsRequest): ListDraftsRequest.AsObject;
  static serializeBinaryToWriter(message: ListDraftsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListDraftsRequest;
  static deserializeBinaryFromReader(message: ListDraftsRequest, reader: jspb.BinaryReader): ListDraftsRequest;
}

export namespace ListDraftsRequest {
  export type AsObject = {
    pageSize: number,
    pageToken: string,
  }

  export enum View { 
    VIEW_UNSPECIFIED = 0,
    BASIC = 1,
    FULL = 2,
  }
}

export class ListDraftsResponse extends jspb.Message {
  getDocumentsList(): Array<Document>;
  setDocumentsList(value: Array<Document>): void;
  clearDocumentsList(): void;
  addDocuments(value?: Document, index?: number): Document;

  getNextPageToken(): string;
  setNextPageToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListDraftsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListDraftsResponse): ListDraftsResponse.AsObject;
  static serializeBinaryToWriter(message: ListDraftsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListDraftsResponse;
  static deserializeBinaryFromReader(message: ListDraftsResponse, reader: jspb.BinaryReader): ListDraftsResponse;
}

export namespace ListDraftsResponse {
  export type AsObject = {
    documentsList: Array<Document.AsObject>,
    nextPageToken: string,
  }
}

export class PublishDraftRequest extends jspb.Message {
  getDocumentId(): string;
  setDocumentId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PublishDraftRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PublishDraftRequest): PublishDraftRequest.AsObject;
  static serializeBinaryToWriter(message: PublishDraftRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PublishDraftRequest;
  static deserializeBinaryFromReader(message: PublishDraftRequest, reader: jspb.BinaryReader): PublishDraftRequest;
}

export namespace PublishDraftRequest {
  export type AsObject = {
    documentId: string,
  }
}

export class PublishDraftResponse extends jspb.Message {
  getVersion(): string;
  setVersion(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PublishDraftResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PublishDraftResponse): PublishDraftResponse.AsObject;
  static serializeBinaryToWriter(message: PublishDraftResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PublishDraftResponse;
  static deserializeBinaryFromReader(message: PublishDraftResponse, reader: jspb.BinaryReader): PublishDraftResponse;
}

export namespace PublishDraftResponse {
  export type AsObject = {
    version: string,
  }
}

export class GetPublicationRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPublicationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPublicationRequest): GetPublicationRequest.AsObject;
  static serializeBinaryToWriter(message: GetPublicationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPublicationRequest;
  static deserializeBinaryFromReader(message: GetPublicationRequest, reader: jspb.BinaryReader): GetPublicationRequest;
}

export namespace GetPublicationRequest {
  export type AsObject = {
  }
}

export class DeletePublicationRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeletePublicationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeletePublicationRequest): DeletePublicationRequest.AsObject;
  static serializeBinaryToWriter(message: DeletePublicationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeletePublicationRequest;
  static deserializeBinaryFromReader(message: DeletePublicationRequest, reader: jspb.BinaryReader): DeletePublicationRequest;
}

export namespace DeletePublicationRequest {
  export type AsObject = {
  }
}

export class ListPublicationsRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPublicationsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListPublicationsRequest): ListPublicationsRequest.AsObject;
  static serializeBinaryToWriter(message: ListPublicationsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPublicationsRequest;
  static deserializeBinaryFromReader(message: ListPublicationsRequest, reader: jspb.BinaryReader): ListPublicationsRequest;
}

export namespace ListPublicationsRequest {
  export type AsObject = {
  }
}

export class ListPublicationsResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPublicationsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListPublicationsResponse): ListPublicationsResponse.AsObject;
  static serializeBinaryToWriter(message: ListPublicationsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPublicationsResponse;
  static deserializeBinaryFromReader(message: ListPublicationsResponse, reader: jspb.BinaryReader): ListPublicationsResponse;
}

export namespace ListPublicationsResponse {
  export type AsObject = {
  }
}

export class Publication extends jspb.Message {
  getVersion(): string;
  setVersion(value: string): void;

  getDocument(): Document | undefined;
  setDocument(value?: Document): void;
  hasDocument(): boolean;
  clearDocument(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Publication.AsObject;
  static toObject(includeInstance: boolean, msg: Publication): Publication.AsObject;
  static serializeBinaryToWriter(message: Publication, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Publication;
  static deserializeBinaryFromReader(message: Publication, reader: jspb.BinaryReader): Publication;
}

export namespace Publication {
  export type AsObject = {
    version: string,
    document?: Document.AsObject,
  }
}

export class Document extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getTitle(): string;
  setTitle(value: string): void;

  getSubtitle(): string;
  setSubtitle(value: string): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  getChildrenListStyle(): ListStyle;
  setChildrenListStyle(value: ListStyle): void;

  getChildrenList(): Array<string>;
  setChildrenList(value: Array<string>): void;
  clearChildrenList(): void;
  addChildren(value: string, index?: number): void;

  getBlocksMap(): jspb.Map<string, Block>;
  clearBlocksMap(): void;

  getLinksMap(): jspb.Map<string, Link>;
  clearLinksMap(): void;

  getCreateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasCreateTime(): boolean;
  clearCreateTime(): void;

  getUpdateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasUpdateTime(): boolean;
  clearUpdateTime(): void;

  getPublishTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPublishTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasPublishTime(): boolean;
  clearPublishTime(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Document.AsObject;
  static toObject(includeInstance: boolean, msg: Document): Document.AsObject;
  static serializeBinaryToWriter(message: Document, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Document;
  static deserializeBinaryFromReader(message: Document, reader: jspb.BinaryReader): Document;
}

export namespace Document {
  export type AsObject = {
    id: string,
    title: string,
    subtitle: string,
    author: string,
    childrenListStyle: ListStyle,
    childrenList: Array<string>,
    blocksMap: Array<[string, Block.AsObject]>,
    linksMap: Array<[string, Link.AsObject]>,
    createTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    updateTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class Link extends jspb.Message {
  getUri(): string;
  setUri(value: string): void;

  getContentType(): string;
  setContentType(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Link.AsObject;
  static toObject(includeInstance: boolean, msg: Link): Link.AsObject;
  static serializeBinaryToWriter(message: Link, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Link;
  static deserializeBinaryFromReader(message: Link, reader: jspb.BinaryReader): Link;
}

export namespace Link {
  export type AsObject = {
    uri: string,
    contentType: string,
  }
}

export class Block extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getParent(): string;
  setParent(value: string): void;

  getType(): Block.Type;
  setType(value: Block.Type): void;

  getElementsList(): Array<InlineElement>;
  setElementsList(value: Array<InlineElement>): void;
  clearElementsList(): void;
  addElements(value?: InlineElement, index?: number): InlineElement;

  getChildListStyle(): ListStyle;
  setChildListStyle(value: ListStyle): void;

  getChildrenList(): Array<string>;
  setChildrenList(value: Array<string>): void;
  clearChildrenList(): void;
  addChildren(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Block.AsObject;
  static toObject(includeInstance: boolean, msg: Block): Block.AsObject;
  static serializeBinaryToWriter(message: Block, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Block;
  static deserializeBinaryFromReader(message: Block, reader: jspb.BinaryReader): Block;
}

export namespace Block {
  export type AsObject = {
    id: string,
    parent: string,
    type: Block.Type,
    elementsList: Array<InlineElement.AsObject>,
    childListStyle: ListStyle,
    childrenList: Array<string>,
  }

  export enum Type { 
    BASIC = 0,
    HEADING = 1,
  }
}

export class InlineElement extends jspb.Message {
  getTextRun(): TextRun | undefined;
  setTextRun(value?: TextRun): void;
  hasTextRun(): boolean;
  clearTextRun(): void;

  getImage(): Image | undefined;
  setImage(value?: Image): void;
  hasImage(): boolean;
  clearImage(): void;

  getQuote(): Quote | undefined;
  setQuote(value?: Quote): void;
  hasQuote(): boolean;
  clearQuote(): void;

  getContentCase(): InlineElement.ContentCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): InlineElement.AsObject;
  static toObject(includeInstance: boolean, msg: InlineElement): InlineElement.AsObject;
  static serializeBinaryToWriter(message: InlineElement, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): InlineElement;
  static deserializeBinaryFromReader(message: InlineElement, reader: jspb.BinaryReader): InlineElement;
}

export namespace InlineElement {
  export type AsObject = {
    textRun?: TextRun.AsObject,
    image?: Image.AsObject,
    quote?: Quote.AsObject,
  }

  export enum ContentCase { 
    CONTENT_NOT_SET = 0,
    TEXT_RUN = 1,
    IMAGE = 2,
    QUOTE = 3,
  }
}

export class TextRun extends jspb.Message {
  getText(): string;
  setText(value: string): void;

  getBold(): boolean;
  setBold(value: boolean): void;

  getUnderline(): boolean;
  setUnderline(value: boolean): void;

  getStrikethrough(): boolean;
  setStrikethrough(value: boolean): void;

  getCode(): boolean;
  setCode(value: boolean): void;

  getBlockquote(): boolean;
  setBlockquote(value: boolean): void;

  getLinkKey(): string;
  setLinkKey(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TextRun.AsObject;
  static toObject(includeInstance: boolean, msg: TextRun): TextRun.AsObject;
  static serializeBinaryToWriter(message: TextRun, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TextRun;
  static deserializeBinaryFromReader(message: TextRun, reader: jspb.BinaryReader): TextRun;
}

export namespace TextRun {
  export type AsObject = {
    text: string,
    bold: boolean,
    underline: boolean,
    strikethrough: boolean,
    code: boolean,
    blockquote: boolean,
    linkKey: string,
  }
}

export class Image extends jspb.Message {
  getAltText(): string;
  setAltText(value: string): void;

  getLinkKey(): string;
  setLinkKey(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Image.AsObject;
  static toObject(includeInstance: boolean, msg: Image): Image.AsObject;
  static serializeBinaryToWriter(message: Image, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Image;
  static deserializeBinaryFromReader(message: Image, reader: jspb.BinaryReader): Image;
}

export namespace Image {
  export type AsObject = {
    altText: string,
    linkKey: string,
  }
}

export class Quote extends jspb.Message {
  getLinkKey(): string;
  setLinkKey(value: string): void;

  getStartOffset(): number;
  setStartOffset(value: number): void;

  getEndOffset(): number;
  setEndOffset(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Quote.AsObject;
  static toObject(includeInstance: boolean, msg: Quote): Quote.AsObject;
  static serializeBinaryToWriter(message: Quote, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Quote;
  static deserializeBinaryFromReader(message: Quote, reader: jspb.BinaryReader): Quote;
}

export namespace Quote {
  export type AsObject = {
    linkKey: string,
    startOffset: number,
    endOffset: number,
  }
}

export enum ListStyle { 
  NONE = 0,
  BULLET = 1,
  NUMBER = 2,
}
