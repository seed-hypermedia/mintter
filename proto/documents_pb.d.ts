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

export class GetPublicationRequest extends jspb.Message {
  getPublicationId(): string;
  setPublicationId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPublicationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPublicationRequest): GetPublicationRequest.AsObject;
  static serializeBinaryToWriter(message: GetPublicationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPublicationRequest;
  static deserializeBinaryFromReader(message: GetPublicationRequest, reader: jspb.BinaryReader): GetPublicationRequest;
}

export namespace GetPublicationRequest {
  export type AsObject = {
    publicationId: string,
  }
}

export class ListPublicationsRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): void;

  getPageToken(): string;
  setPageToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPublicationsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListPublicationsRequest): ListPublicationsRequest.AsObject;
  static serializeBinaryToWriter(message: ListPublicationsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPublicationsRequest;
  static deserializeBinaryFromReader(message: ListPublicationsRequest, reader: jspb.BinaryReader): ListPublicationsRequest;
}

export namespace ListPublicationsRequest {
  export type AsObject = {
    pageSize: number,
    pageToken: string,
  }
}

export class ListPublicationsResponse extends jspb.Message {
  getPublicationsList(): Array<Publication>;
  setPublicationsList(value: Array<Publication>): void;
  clearPublicationsList(): void;
  addPublications(value?: Publication, index?: number): Publication;

  getNextPageToken(): string;
  setNextPageToken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPublicationsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListPublicationsResponse): ListPublicationsResponse.AsObject;
  static serializeBinaryToWriter(message: ListPublicationsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPublicationsResponse;
  static deserializeBinaryFromReader(message: ListPublicationsResponse, reader: jspb.BinaryReader): ListPublicationsResponse;
}

export namespace ListPublicationsResponse {
  export type AsObject = {
    publicationsList: Array<Publication.AsObject>,
    nextPageToken: string,
  }
}

export class GetSectionRequest extends jspb.Message {
  getSectionId(): string;
  setSectionId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetSectionRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetSectionRequest): GetSectionRequest.AsObject;
  static serializeBinaryToWriter(message: GetSectionRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetSectionRequest;
  static deserializeBinaryFromReader(message: GetSectionRequest, reader: jspb.BinaryReader): GetSectionRequest;
}

export namespace GetSectionRequest {
  export type AsObject = {
    sectionId: string,
  }
}

export class BatchGetSectionsRequest extends jspb.Message {
  getSectionIdsList(): Array<string>;
  setSectionIdsList(value: Array<string>): void;
  clearSectionIdsList(): void;
  addSectionIds(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BatchGetSectionsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: BatchGetSectionsRequest): BatchGetSectionsRequest.AsObject;
  static serializeBinaryToWriter(message: BatchGetSectionsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BatchGetSectionsRequest;
  static deserializeBinaryFromReader(message: BatchGetSectionsRequest, reader: jspb.BinaryReader): BatchGetSectionsRequest;
}

export namespace BatchGetSectionsRequest {
  export type AsObject = {
    sectionIdsList: Array<string>,
  }
}

export class BatchGetSectionsResponse extends jspb.Message {
  getSectionsList(): Array<Section>;
  setSectionsList(value: Array<Section>): void;
  clearSectionsList(): void;
  addSections(value?: Section, index?: number): Section;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BatchGetSectionsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: BatchGetSectionsResponse): BatchGetSectionsResponse.AsObject;
  static serializeBinaryToWriter(message: BatchGetSectionsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BatchGetSectionsResponse;
  static deserializeBinaryFromReader(message: BatchGetSectionsResponse, reader: jspb.BinaryReader): BatchGetSectionsResponse;
}

export namespace BatchGetSectionsResponse {
  export type AsObject = {
    sectionsList: Array<Section.AsObject>,
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
  getId(): string;
  setId(value: string): void;

  getDocumentId(): string;
  setDocumentId(value: string): void;

  getTitle(): string;
  setTitle(value: string): void;

  getDescription(): string;
  setDescription(value: string): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  getPrevious(): string;
  setPrevious(value: string): void;

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
    id: string,
    documentId: string,
    title: string,
    description: string,
    author: string,
    previous: string,
    sectionsList: Array<string>,
    createTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

