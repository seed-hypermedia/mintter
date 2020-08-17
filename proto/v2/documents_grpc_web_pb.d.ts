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
  PublishDocumentRequest,
  PublishDocumentResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse} from './documents_pb';

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

  getDocument(
    request: GetDocumentRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: GetDocumentResponse) => void
  ): grpcWeb.ClientReadableStream<GetDocumentResponse>;

  updateDocument(
    request: UpdateDocumentRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: UpdateDocumentResponse) => void
  ): grpcWeb.ClientReadableStream<UpdateDocumentResponse>;

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

  publishDocument(
    request: PublishDocumentRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: PublishDocumentResponse) => void
  ): grpcWeb.ClientReadableStream<PublishDocumentResponse>;

}

export class DocumentsPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: string; });

  createDraft(
    request: CreateDraftRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<Document>;

  getDocument(
    request: GetDocumentRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<GetDocumentResponse>;

  updateDocument(
    request: UpdateDocumentRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<UpdateDocumentResponse>;

  listDocuments(
    request: ListDocumentsRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<ListDocumentsResponse>;

  deleteDocument(
    request: DeleteDocumentRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<google_protobuf_empty_pb.Empty>;

  publishDocument(
    request: PublishDocumentRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<PublishDocumentResponse>;

}

