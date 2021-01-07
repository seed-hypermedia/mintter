import * as grpcWeb from 'grpc-web';

import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb';
import * as documents_v1alpha_resources_pb from '../../documents/v1alpha/resources_pb';

import {
  CreateDraftRequest,
  DeleteDraftRequest,
  DeletePublicationRequest,
  GetDraftRequest,
  GetPublicationRequest,
  ListDraftsRequest,
  ListDraftsResponse,
  ListPublicationsRequest,
  ListPublicationsResponse,
  PublishDraftRequest,
  PublishDraftResponse,
  UpdateDraftRequest,
  UpdateDraftResponse} from './services_pb';

export class DraftsClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: documents_v1alpha_resources_pb.Document) => void
  ): grpcWeb.ClientReadableStream<documents_v1alpha_resources_pb.Document>;

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
               response: documents_v1alpha_resources_pb.Document) => void
  ): grpcWeb.ClientReadableStream<documents_v1alpha_resources_pb.Document>;

  updateDraft(
    request: UpdateDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: UpdateDraftResponse) => void
  ): grpcWeb.ClientReadableStream<UpdateDraftResponse>;

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
               response: documents_v1alpha_resources_pb.Publication) => void
  ): grpcWeb.ClientReadableStream<documents_v1alpha_resources_pb.Publication>;

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
  ): Promise<documents_v1alpha_resources_pb.Document>;

  deleteDraft(
    request: DeleteDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<google_protobuf_empty_pb.Empty>;

  getDraft(
    request: GetDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<documents_v1alpha_resources_pb.Document>;

  updateDraft(
    request: UpdateDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<UpdateDraftResponse>;

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
  ): Promise<documents_v1alpha_resources_pb.Publication>;

  deletePublication(
    request: DeletePublicationRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<google_protobuf_empty_pb.Empty>;

  listPublications(
    request: ListPublicationsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListPublicationsResponse>;

}

