import * as grpcWeb from 'grpc-web';

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';
import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb';

import {
  CreateDraftRequest,
  DeleteDocumentRequest,
  Document,
  GetDocumentRequest,
  GetDocumentResponse,
  ListDocumentsRequest,
  ListDocumentsResponse,
  PublishDraftRequest,
  PublishDraftResponse,
  UpdateDraftRequest,
  UpdateDraftResponse} from './documents_pb';

export class DocumentsClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: Document) => void
  ): grpcWeb.ClientReadableStream<Document>;

  updateDraft(
    request: UpdateDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: UpdateDraftResponse) => void
  ): grpcWeb.ClientReadableStream<UpdateDraftResponse>;

  publishDraft(
    request: PublishDraftRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: PublishDraftResponse) => void
  ): grpcWeb.ClientReadableStream<PublishDraftResponse>;

  getDocument(
    request: GetDocumentRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GetDocumentResponse) => void
  ): grpcWeb.ClientReadableStream<GetDocumentResponse>;

  listDocuments(
    request: ListDocumentsRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: ListDocumentsResponse) => void
  ): grpcWeb.ClientReadableStream<ListDocumentsResponse>;

  deleteDocument(
    request: DeleteDocumentRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: google_protobuf_empty_pb.Empty) => void
  ): grpcWeb.ClientReadableStream<google_protobuf_empty_pb.Empty>;

}

export class DocumentsPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Document>;

  updateDraft(
    request: UpdateDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<UpdateDraftResponse>;

  publishDraft(
    request: PublishDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<PublishDraftResponse>;

  getDocument(
    request: GetDocumentRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GetDocumentResponse>;

  listDocuments(
    request: ListDocumentsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListDocumentsResponse>;

  deleteDocument(
    request: DeleteDocumentRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<google_protobuf_empty_pb.Empty>;

}

