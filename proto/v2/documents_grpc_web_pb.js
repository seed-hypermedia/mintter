/**
 * @fileoverview gRPC-Web generated client stub for mintter.v2
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');


var google_protobuf_timestamp_pb = require('google-protobuf/google/protobuf/timestamp_pb.js')

var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js')
const proto = {};
proto.mintter = {};
proto.mintter.v2 = require('./documents_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.mintter.v2.DocumentsClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options['format'] = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.mintter.v2.DocumentsPromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options['format'] = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.mintter.v2.CreateDraftRequest,
 *   !proto.mintter.v2.Document>}
 */
const methodDescriptor_Documents_CreateDraft = new grpc.web.MethodDescriptor(
  '/mintter.v2.Documents/CreateDraft',
  grpc.web.MethodType.UNARY,
  proto.mintter.v2.CreateDraftRequest,
  proto.mintter.v2.Document,
  /**
   * @param {!proto.mintter.v2.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.Document.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.mintter.v2.CreateDraftRequest,
 *   !proto.mintter.v2.Document>}
 */
const methodInfo_Documents_CreateDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.mintter.v2.Document,
  /**
   * @param {!proto.mintter.v2.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.Document.deserializeBinary
);


/**
 * @param {!proto.mintter.v2.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.mintter.v2.Document)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.mintter.v2.Document>|undefined}
 *     The XHR Node Readable Stream
 */
proto.mintter.v2.DocumentsClient.prototype.createDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/mintter.v2.Documents/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_CreateDraft,
      callback);
};


/**
 * @param {!proto.mintter.v2.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.mintter.v2.Document>}
 *     A native promise that resolves to the response
 */
proto.mintter.v2.DocumentsPromiseClient.prototype.createDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/mintter.v2.Documents/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_CreateDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.mintter.v2.UpdateDraftRequest,
 *   !proto.mintter.v2.UpdateDraftResponse>}
 */
const methodDescriptor_Documents_UpdateDraft = new grpc.web.MethodDescriptor(
  '/mintter.v2.Documents/UpdateDraft',
  grpc.web.MethodType.UNARY,
  proto.mintter.v2.UpdateDraftRequest,
  proto.mintter.v2.UpdateDraftResponse,
  /**
   * @param {!proto.mintter.v2.UpdateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.UpdateDraftResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.mintter.v2.UpdateDraftRequest,
 *   !proto.mintter.v2.UpdateDraftResponse>}
 */
const methodInfo_Documents_UpdateDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.mintter.v2.UpdateDraftResponse,
  /**
   * @param {!proto.mintter.v2.UpdateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.UpdateDraftResponse.deserializeBinary
);


/**
 * @param {!proto.mintter.v2.UpdateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.mintter.v2.UpdateDraftResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.mintter.v2.UpdateDraftResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.mintter.v2.DocumentsClient.prototype.updateDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/mintter.v2.Documents/UpdateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_UpdateDraft,
      callback);
};


/**
 * @param {!proto.mintter.v2.UpdateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.mintter.v2.UpdateDraftResponse>}
 *     A native promise that resolves to the response
 */
proto.mintter.v2.DocumentsPromiseClient.prototype.updateDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/mintter.v2.Documents/UpdateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_UpdateDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.mintter.v2.PublishDraftRequest,
 *   !proto.mintter.v2.PublishDraftResponse>}
 */
const methodDescriptor_Documents_PublishDraft = new grpc.web.MethodDescriptor(
  '/mintter.v2.Documents/PublishDraft',
  grpc.web.MethodType.UNARY,
  proto.mintter.v2.PublishDraftRequest,
  proto.mintter.v2.PublishDraftResponse,
  /**
   * @param {!proto.mintter.v2.PublishDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.PublishDraftResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.mintter.v2.PublishDraftRequest,
 *   !proto.mintter.v2.PublishDraftResponse>}
 */
const methodInfo_Documents_PublishDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.mintter.v2.PublishDraftResponse,
  /**
   * @param {!proto.mintter.v2.PublishDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.PublishDraftResponse.deserializeBinary
);


/**
 * @param {!proto.mintter.v2.PublishDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.mintter.v2.PublishDraftResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.mintter.v2.PublishDraftResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.mintter.v2.DocumentsClient.prototype.publishDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/mintter.v2.Documents/PublishDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_PublishDraft,
      callback);
};


/**
 * @param {!proto.mintter.v2.PublishDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.mintter.v2.PublishDraftResponse>}
 *     A native promise that resolves to the response
 */
proto.mintter.v2.DocumentsPromiseClient.prototype.publishDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/mintter.v2.Documents/PublishDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_PublishDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.mintter.v2.GetDocumentRequest,
 *   !proto.mintter.v2.GetDocumentResponse>}
 */
const methodDescriptor_Documents_GetDocument = new grpc.web.MethodDescriptor(
  '/mintter.v2.Documents/GetDocument',
  grpc.web.MethodType.UNARY,
  proto.mintter.v2.GetDocumentRequest,
  proto.mintter.v2.GetDocumentResponse,
  /**
   * @param {!proto.mintter.v2.GetDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.GetDocumentResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.mintter.v2.GetDocumentRequest,
 *   !proto.mintter.v2.GetDocumentResponse>}
 */
const methodInfo_Documents_GetDocument = new grpc.web.AbstractClientBase.MethodInfo(
  proto.mintter.v2.GetDocumentResponse,
  /**
   * @param {!proto.mintter.v2.GetDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.GetDocumentResponse.deserializeBinary
);


/**
 * @param {!proto.mintter.v2.GetDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.mintter.v2.GetDocumentResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.mintter.v2.GetDocumentResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.mintter.v2.DocumentsClient.prototype.getDocument =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/mintter.v2.Documents/GetDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_GetDocument,
      callback);
};


/**
 * @param {!proto.mintter.v2.GetDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.mintter.v2.GetDocumentResponse>}
 *     A native promise that resolves to the response
 */
proto.mintter.v2.DocumentsPromiseClient.prototype.getDocument =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/mintter.v2.Documents/GetDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_GetDocument);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.mintter.v2.ListDocumentsRequest,
 *   !proto.mintter.v2.ListDocumentsResponse>}
 */
const methodDescriptor_Documents_ListDocuments = new grpc.web.MethodDescriptor(
  '/mintter.v2.Documents/ListDocuments',
  grpc.web.MethodType.UNARY,
  proto.mintter.v2.ListDocumentsRequest,
  proto.mintter.v2.ListDocumentsResponse,
  /**
   * @param {!proto.mintter.v2.ListDocumentsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.ListDocumentsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.mintter.v2.ListDocumentsRequest,
 *   !proto.mintter.v2.ListDocumentsResponse>}
 */
const methodInfo_Documents_ListDocuments = new grpc.web.AbstractClientBase.MethodInfo(
  proto.mintter.v2.ListDocumentsResponse,
  /**
   * @param {!proto.mintter.v2.ListDocumentsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.mintter.v2.ListDocumentsResponse.deserializeBinary
);


/**
 * @param {!proto.mintter.v2.ListDocumentsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.mintter.v2.ListDocumentsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.mintter.v2.ListDocumentsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.mintter.v2.DocumentsClient.prototype.listDocuments =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/mintter.v2.Documents/ListDocuments',
      request,
      metadata || {},
      methodDescriptor_Documents_ListDocuments,
      callback);
};


/**
 * @param {!proto.mintter.v2.ListDocumentsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.mintter.v2.ListDocumentsResponse>}
 *     A native promise that resolves to the response
 */
proto.mintter.v2.DocumentsPromiseClient.prototype.listDocuments =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/mintter.v2.Documents/ListDocuments',
      request,
      metadata || {},
      methodDescriptor_Documents_ListDocuments);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.mintter.v2.DeleteDocumentRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodDescriptor_Documents_DeleteDocument = new grpc.web.MethodDescriptor(
  '/mintter.v2.Documents/DeleteDocument',
  grpc.web.MethodType.UNARY,
  proto.mintter.v2.DeleteDocumentRequest,
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.mintter.v2.DeleteDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  google_protobuf_empty_pb.Empty.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.mintter.v2.DeleteDocumentRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodInfo_Documents_DeleteDocument = new grpc.web.AbstractClientBase.MethodInfo(
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.mintter.v2.DeleteDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  google_protobuf_empty_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.mintter.v2.DeleteDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.google.protobuf.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.google.protobuf.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.mintter.v2.DocumentsClient.prototype.deleteDocument =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/mintter.v2.Documents/DeleteDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_DeleteDocument,
      callback);
};


/**
 * @param {!proto.mintter.v2.DeleteDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.google.protobuf.Empty>}
 *     A native promise that resolves to the response
 */
proto.mintter.v2.DocumentsPromiseClient.prototype.deleteDocument =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/mintter.v2.Documents/DeleteDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_DeleteDocument);
};


module.exports = proto.mintter.v2;

