import * as jspb from "google-protobuf"

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';
import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb';

export class CreateDraftRequest extends jspb.Message {
  getParent(): string;
  setParent(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateDraftRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateDraftRequest): CreateDraftRequest.AsObject;
  static serializeBinaryToWriter(message: CreateDraftRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateDraftRequest;
  static deserializeBinaryFromReader(message: CreateDraftRequest, reader: jspb.BinaryReader): CreateDraftRequest;
}

export namespace CreateDraftRequest {
  export type AsObject = {
    parent: string,
  }
}

export class GetDocumentRequest extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getVersion(): string;
  setVersion(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetDocumentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetDocumentRequest): GetDocumentRequest.AsObject;
  static serializeBinaryToWriter(message: GetDocumentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetDocumentRequest;
  static deserializeBinaryFromReader(message: GetDocumentRequest, reader: jspb.BinaryReader): GetDocumentRequest;
}

export namespace GetDocumentRequest {
  export type AsObject = {
    id: string,
    version: string,
  }
}

export class ListDocumentsRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): void;

  getPageToken(): string;
  setPageToken(value: string): void;

  getPublishingState(): PublishingState;
  setPublishingState(value: PublishingState): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListDocumentsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListDocumentsRequest): ListDocumentsRequest.AsObject;
  static serializeBinaryToWriter(message: ListDocumentsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListDocumentsRequest;
  static deserializeBinaryFromReader(message: ListDocumentsRequest, reader: jspb.BinaryReader): ListDocumentsRequest;
}

export namespace ListDocumentsRequest {
  export type AsObject = {
    pageSize: number,
    pageToken: string,
    publishingState: PublishingState,
    author: string,
  }
}

export class ListDocumentsResponse extends jspb.Message {
  getDocumentsList(): Array<Document>;
  setDocumentsList(value: Array<Document>): void;
  clearDocumentsList(): void;
  addDocuments(value?: Document, index?: number): Document;

  getNextPageToken(): string;
  setNextPageToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListDocumentsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListDocumentsResponse): ListDocumentsResponse.AsObject;
  static serializeBinaryToWriter(message: ListDocumentsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListDocumentsResponse;
  static deserializeBinaryFromReader(message: ListDocumentsResponse, reader: jspb.BinaryReader): ListDocumentsResponse;
}

export namespace ListDocumentsResponse {
  export type AsObject = {
    documentsList: Array<Document.AsObject>,
    nextPageToken: string,
  }
}

export class DeleteDocumentRequest extends jspb.Message {
  getVersion(): string;
  setVersion(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteDocumentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteDocumentRequest): DeleteDocumentRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteDocumentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteDocumentRequest;
  static deserializeBinaryFromReader(message: DeleteDocumentRequest, reader: jspb.BinaryReader): DeleteDocumentRequest;
}

export namespace DeleteDocumentRequest {
  export type AsObject = {
    version: string,
  }
}

export class PublishDocumentRequest extends jspb.Message {
  getVersion(): string;
  setVersion(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PublishDocumentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PublishDocumentRequest): PublishDocumentRequest.AsObject;
  static serializeBinaryToWriter(message: PublishDocumentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PublishDocumentRequest;
  static deserializeBinaryFromReader(message: PublishDocumentRequest, reader: jspb.BinaryReader): PublishDocumentRequest;
}

export namespace PublishDocumentRequest {
  export type AsObject = {
    version: string,
  }
}

export class PublishDocumentResponse extends jspb.Message {
  getVersion(): string;
  setVersion(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PublishDocumentResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PublishDocumentResponse): PublishDocumentResponse.AsObject;
  static serializeBinaryToWriter(message: PublishDocumentResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PublishDocumentResponse;
  static deserializeBinaryFromReader(message: PublishDocumentResponse, reader: jspb.BinaryReader): PublishDocumentResponse;
}

export namespace PublishDocumentResponse {
  export type AsObject = {
    version: string,
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

  getPublishingState(): PublishingState;
  setPublishingState(value: PublishingState): void;

  getBlockList(): BlockList | undefined;
  setBlockList(value?: BlockList): void;
  hasBlockList(): boolean;
  clearBlockList(): void;

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

  getVersion(): string;
  setVersion(value: string): void;

  getParent(): string;
  setParent(value: string): void;

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
    publishingState: PublishingState,
    blockList?: BlockList.AsObject,
    createTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    updateTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    version: string,
    parent: string,
  }
}

export class BlockList extends jspb.Message {
  getListStyle(): BlockList.Style;
  setListStyle(value: BlockList.Style): void;

  getBlocksList(): Array<Block>;
  setBlocksList(value: Array<Block>): void;
  clearBlocksList(): void;
  addBlocks(value?: Block, index?: number): Block;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BlockList.AsObject;
  static toObject(includeInstance: boolean, msg: BlockList): BlockList.AsObject;
  static serializeBinaryToWriter(message: BlockList, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BlockList;
  static deserializeBinaryFromReader(message: BlockList, reader: jspb.BinaryReader): BlockList;
}

export namespace BlockList {
  export type AsObject = {
    listStyle: BlockList.Style,
    blocksList: Array<Block.AsObject>,
  }

  export enum Style { 
    NONE = 0,
    ORDERED = 1,
    UNORDERED = 2,
  }
}

export class Block extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getBlockList(): BlockList | undefined;
  setBlockList(value?: BlockList): void;
  hasBlockList(): boolean;
  clearBlockList(): void;

  getTextBlock(): TextBlock | undefined;
  setTextBlock(value?: TextBlock): void;
  hasTextBlock(): boolean;
  clearTextBlock(): void;

  getContentCase(): Block.ContentCase;

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
    blockList?: BlockList.AsObject,
    textBlock?: TextBlock.AsObject,
  }

  export enum ContentCase { 
    CONTENT_NOT_SET = 0,
    TEXT_BLOCK = 3,
  }
}

export class TextBlock extends jspb.Message {
  getText(): string;
  setText(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TextBlock.AsObject;
  static toObject(includeInstance: boolean, msg: TextBlock): TextBlock.AsObject;
  static serializeBinaryToWriter(message: TextBlock, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TextBlock;
  static deserializeBinaryFromReader(message: TextBlock, reader: jspb.BinaryReader): TextBlock;
}

export namespace TextBlock {
  export type AsObject = {
    text: string,
  }
}

export class ImageBlock extends jspb.Message {
  getUri(): string;
  setUri(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ImageBlock.AsObject;
  static toObject(includeInstance: boolean, msg: ImageBlock): ImageBlock.AsObject;
  static serializeBinaryToWriter(message: ImageBlock, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ImageBlock;
  static deserializeBinaryFromReader(message: ImageBlock, reader: jspb.BinaryReader): ImageBlock;
}

export namespace ImageBlock {
  export type AsObject = {
    uri: string,
  }
}

export enum PublishingState { 
  UNSPECIFIED = 0,
  DRAFT = 1,
  PUBLISHED = 2,
}
