import * as grpcWeb from 'grpc-web';

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';
import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb';

import {
  CreateDraftRequest,
  DeleteDraftRequest,
  DeletePublicationRequest,
  Document,
  GetDraftRequest,
  GetPublicationRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  ListPublicationsRequest,
  ListPublicationsResponse,
  Publication,
  PublishDraftRequest,
  PublishDraftResponse,
  UpdateDraftRequest} from './documents_pb';

export class DraftsClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Document) => void
  ): grpcWeb.ClientReadableStream<Document>;

  deleteDraft(
    request: DeleteDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: google_protobuf_empty_pb.Empty) => void
  ): grpcWeb.ClientReadableStream<google_protobuf_empty_pb.Empty>;

  getDraft(
    request: GetDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Document) => void
  ): grpcWeb.ClientReadableStream<Document>;

  updateDraft(
    request: UpdateDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Document) => void
  ): grpcWeb.ClientReadableStream<Document>;

  listDrafts(
    request: ListDraftsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListDraftsResponse) => void
  ): grpcWeb.ClientReadableStream<ListDraftsResponse>;

  publishDraft(
    request: PublishDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: PublishDraftResponse) => void
  ): grpcWeb.ClientReadableStream<PublishDraftResponse>;

}

export class PublicationsClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  getPublication(
    request: GetPublicationRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Publication) => void
  ): grpcWeb.ClientReadableStream<Publication>;

  deletePublication(
    request: DeletePublicationRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: google_protobuf_empty_pb.Empty) => void
  ): grpcWeb.ClientReadableStream<google_protobuf_empty_pb.Empty>;

  listPublications(
    request: ListPublicationsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListPublicationsResponse) => void
  ): grpcWeb.ClientReadableStream<ListPublicationsResponse>;

}

export class DraftsPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Document>;

  deleteDraft(
    request: DeleteDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<google_protobuf_empty_pb.Empty>;

  getDraft(
    request: GetDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Document>;

  updateDraft(
    request: UpdateDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Document>;

  listDrafts(
    request: ListDraftsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListDraftsResponse>;

  publishDraft(
    request: PublishDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<PublishDraftResponse>;

}

export class PublicationsPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  getPublication(
    request: GetPublicationRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Publication>;

  deletePublication(
    request: DeletePublicationRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<google_protobuf_empty_pb.Empty>;

  listPublications(
    request: ListPublicationsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListPublicationsResponse>;

}

