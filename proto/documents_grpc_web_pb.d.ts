import * as grpcWeb from 'grpc-web';

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';
import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb';

import {
  BatchGetSectionsRequest,
  BatchGetSectionsResponse,
  CreateDraftRequest,
  DeleteDraftRequest,
  Draft,
  GetDraftRequest,
  GetSectionRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  ListPublicationsRequest,
  ListPublicationsResponse,
  Publication,
  PublishDraftRequest,
  Section} from './documents_pb';

export class DocumentsClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Draft) => void
  ): grpcWeb.ClientReadableStream<Draft>;

  getDraft(
    request: GetDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Draft) => void
  ): grpcWeb.ClientReadableStream<Draft>;

  listDrafts(
    request: ListDraftsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListDraftsResponse) => void
  ): grpcWeb.ClientReadableStream<ListDraftsResponse>;

  saveDraft(
    request: Draft,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Draft) => void
  ): grpcWeb.ClientReadableStream<Draft>;

  deleteDraft(
    request: DeleteDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: google_protobuf_empty_pb.Empty) => void
  ): grpcWeb.ClientReadableStream<google_protobuf_empty_pb.Empty>;

  publishDraft(
    request: PublishDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Publication) => void
  ): grpcWeb.ClientReadableStream<Publication>;

  listPublications(
    request: ListPublicationsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListPublicationsResponse) => void
  ): grpcWeb.ClientReadableStream<ListPublicationsResponse>;

  getSection(
    request: GetSectionRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Section) => void
  ): grpcWeb.ClientReadableStream<Section>;

  batchGetSections(
    request: BatchGetSectionsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: BatchGetSectionsResponse) => void
  ): grpcWeb.ClientReadableStream<BatchGetSectionsResponse>;

}

export class DocumentsPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Draft>;

  getDraft(
    request: GetDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Draft>;

  listDrafts(
    request: ListDraftsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListDraftsResponse>;

  saveDraft(
    request: Draft,
    metadata?: grpcWeb.Metadata
  ): Promise<Draft>;

  deleteDraft(
    request: DeleteDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<google_protobuf_empty_pb.Empty>;

  publishDraft(
    request: PublishDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Publication>;

  listPublications(
    request: ListPublicationsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListPublicationsResponse>;

  getSection(
    request: GetSectionRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Section>;

  batchGetSections(
    request: BatchGetSectionsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<BatchGetSectionsResponse>;

}

