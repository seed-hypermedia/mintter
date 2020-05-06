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
}

export class ListDraftsResponse extends jspb.Message {
  getDraftsList(): Array<Draft>;
  setDraftsList(value: Array<Draft>): void;
  clearDraftsList(): void;
  addDrafts(value?: Draft, index?: number): Draft;

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
    draftsList: Array<Draft.AsObject>,
    nextPageToken: string,
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

export class PublishDraftRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PublishDraftRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PublishDraftRequest): PublishDraftRequest.AsObject;
  static serializeBinaryToWriter(message: PublishDraftRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PublishDraftRequest;
  static deserializeBinaryFromReader(message: PublishDraftRequest, reader: jspb.BinaryReader): PublishDraftRequest;
}

export namespace PublishDraftRequest {
  export type AsObject = {
  }
}

export class PublishDraftResponse extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PublishDraftResponse.AsObject;
  static toObject(includeInstance: boolean, msg: PublishDraftResponse): PublishDraftResponse.AsObject;
  static serializeBinaryToWriter(message: PublishDraftResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PublishDraftResponse;
  static deserializeBinaryFromReader(message: PublishDraftResponse, reader: jspb.BinaryReader): PublishDraftResponse;
}

export namespace PublishDraftResponse {
  export type AsObject = {
  }
}

export class Draft extends jspb.Message {
  getDocumentId(): string;
  setDocumentId(value: string): void;

  getTitle(): string;
  setTitle(value: string): void;

  getDescription(): string;
  setDescription(value: string): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  getSectionsList(): Array<Section>;
  setSectionsList(value: Array<Section>): void;
  clearSectionsList(): void;
  addSections(value?: Section, index?: number): Section;

  getCreateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasCreateTime(): boolean;
  clearCreateTime(): void;

  getUpdateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasUpdateTime(): boolean;
  clearUpdateTime(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Draft.AsObject;
  static toObject(includeInstance: boolean, msg: Draft): Draft.AsObject;
  static serializeBinaryToWriter(message: Draft, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Draft;
  static deserializeBinaryFromReader(message: Draft, reader: jspb.BinaryReader): Draft;
}

export namespace Draft {
  export type AsObject = {
    documentId: string,
    title: string,
    description: string,
    author: string,
    sectionsList: Array<Section.AsObject>,
    createTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    updateTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class Section extends jspb.Message {
  getDocumentId(): string;
  setDocumentId(value: string): void;

  getTitle(): string;
  setTitle(value: string): void;

  getDescription(): string;
  setDescription(value: string): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  getBody(): string;
  setBody(value: string): void;

  getCreateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasCreateTime(): boolean;
  clearCreateTime(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Section.AsObject;
  static toObject(includeInstance: boolean, msg: Section): Section.AsObject;
  static serializeBinaryToWriter(message: Section, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Section;
  static deserializeBinaryFromReader(message: Section, reader: jspb.BinaryReader): Section;
}

export namespace Section {
  export type AsObject = {
    documentId: string,
    title: string,
    description: string,
    author: string,
    body: string,
    createTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class Publication extends jspb.Message {
  getDocumentId(): string;
  setDocumentId(value: string): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  getSectionsList(): Array<string>;
  setSectionsList(value: Array<string>): void;
  clearSectionsList(): void;
  addSections(value: string, index?: number): void;

  getCreateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasCreateTime(): boolean;
  clearCreateTime(): void;

  getPublishTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPublishTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasPublishTime(): boolean;
  clearPublishTime(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Publication.AsObject;
  static toObject(includeInstance: boolean, msg: Publication): Publication.AsObject;
  static serializeBinaryToWriter(message: Publication, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Publication;
  static deserializeBinaryFromReader(message: Publication, reader: jspb.BinaryReader): Publication;
}

export namespace Publication {
  export type AsObject = {
    documentId: string,
    author: string,
    sectionsList: Array<string>,
    createTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

