/**
 * @fileoverview gRPC-Web generated client stub for 
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');


var google_protobuf_timestamp_pb = require('google-protobuf/google/protobuf/timestamp_pb.js')

var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js')
const proto = require('./documents_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.DocumentsClient =
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
proto.DocumentsPromiseClient =
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
 *   !proto.CreateDraftRequest,
 *   !proto.Document>}
 */
const methodDescriptor_Documents_CreateDraft = new grpc.web.MethodDescriptor(
  '/Documents/CreateDraft',
  grpc.web.MethodType.UNARY,
  proto.CreateDraftRequest,
  proto.Document,
  /**
   * @param {!proto.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Document.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.CreateDraftRequest,
 *   !proto.Document>}
 */
const methodInfo_Documents_CreateDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.Document,
  /**
   * @param {!proto.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Document.deserializeBinary
);


/**
 * @param {!proto.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.Document)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.Document>|undefined}
 *     The XHR Node Readable Stream
 */
proto.DocumentsClient.prototype.createDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/Documents/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_CreateDraft,
      callback);
};


/**
 * @param {!proto.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.Document>}
 *     A native promise that resolves to the response
 */
proto.DocumentsPromiseClient.prototype.createDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/Documents/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_CreateDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.GetDocumentRequest,
 *   !proto.Document>}
 */
const methodDescriptor_Documents_GetDocument = new grpc.web.MethodDescriptor(
  '/Documents/GetDocument',
  grpc.web.MethodType.UNARY,
  proto.GetDocumentRequest,
  proto.Document,
  /**
   * @param {!proto.GetDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Document.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.GetDocumentRequest,
 *   !proto.Document>}
 */
const methodInfo_Documents_GetDocument = new grpc.web.AbstractClientBase.MethodInfo(
  proto.Document,
  /**
   * @param {!proto.GetDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Document.deserializeBinary
);


/**
 * @param {!proto.GetDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.Document)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.Document>|undefined}
 *     The XHR Node Readable Stream
 */
proto.DocumentsClient.prototype.getDocument =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/Documents/GetDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_GetDocument,
      callback);
};


/**
 * @param {!proto.GetDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.Document>}
 *     A native promise that resolves to the response
 */
proto.DocumentsPromiseClient.prototype.getDocument =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/Documents/GetDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_GetDocument);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.ListDocumentsRequest,
 *   !proto.ListDocumentsResponse>}
 */
const methodDescriptor_Documents_ListDocuments = new grpc.web.MethodDescriptor(
  '/Documents/ListDocuments',
  grpc.web.MethodType.UNARY,
  proto.ListDocumentsRequest,
  proto.ListDocumentsResponse,
  /**
   * @param {!proto.ListDocumentsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.ListDocumentsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.ListDocumentsRequest,
 *   !proto.ListDocumentsResponse>}
 */
const methodInfo_Documents_ListDocuments = new grpc.web.AbstractClientBase.MethodInfo(
  proto.ListDocumentsResponse,
  /**
   * @param {!proto.ListDocumentsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.ListDocumentsResponse.deserializeBinary
);


/**
 * @param {!proto.ListDocumentsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.ListDocumentsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.ListDocumentsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.DocumentsClient.prototype.listDocuments =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/Documents/ListDocuments',
      request,
      metadata || {},
      methodDescriptor_Documents_ListDocuments,
      callback);
};


/**
 * @param {!proto.ListDocumentsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.ListDocumentsResponse>}
 *     A native promise that resolves to the response
 */
proto.DocumentsPromiseClient.prototype.listDocuments =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/Documents/ListDocuments',
      request,
      metadata || {},
      methodDescriptor_Documents_ListDocuments);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.Document,
 *   !proto.Document>}
 */
const methodDescriptor_Documents_SaveDraft = new grpc.web.MethodDescriptor(
  '/Documents/SaveDraft',
  grpc.web.MethodType.UNARY,
  proto.Document,
  proto.Document,
  /**
   * @param {!proto.Document} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Document.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.Document,
 *   !proto.Document>}
 */
const methodInfo_Documents_SaveDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.Document,
  /**
   * @param {!proto.Document} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Document.deserializeBinary
);


/**
 * @param {!proto.Document} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.Document)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.Document>|undefined}
 *     The XHR Node Readable Stream
 */
proto.DocumentsClient.prototype.saveDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/Documents/SaveDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_SaveDraft,
      callback);
};


/**
 * @param {!proto.Document} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.Document>}
 *     A native promise that resolves to the response
 */
proto.DocumentsPromiseClient.prototype.saveDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/Documents/SaveDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_SaveDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.DeleteDocumentRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodDescriptor_Documents_DeleteDocument = new grpc.web.MethodDescriptor(
  '/Documents/DeleteDocument',
  grpc.web.MethodType.UNARY,
  proto.DeleteDocumentRequest,
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.DeleteDocumentRequest} request
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
 *   !proto.DeleteDocumentRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodInfo_Documents_DeleteDocument = new grpc.web.AbstractClientBase.MethodInfo(
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.DeleteDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  google_protobuf_empty_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.DeleteDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.google.protobuf.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.google.protobuf.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.DocumentsClient.prototype.deleteDocument =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/Documents/DeleteDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_DeleteDocument,
      callback);
};


/**
 * @param {!proto.DeleteDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.google.protobuf.Empty>}
 *     A native promise that resolves to the response
 */
proto.DocumentsPromiseClient.prototype.deleteDocument =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/Documents/DeleteDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_DeleteDocument);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.PublishDocumentRequest,
 *   !proto.PublishDocumentResponse>}
 */
const methodDescriptor_Documents_PublishDocument = new grpc.web.MethodDescriptor(
  '/Documents/PublishDocument',
  grpc.web.MethodType.UNARY,
  proto.PublishDocumentRequest,
  proto.PublishDocumentResponse,
  /**
   * @param {!proto.PublishDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.PublishDocumentResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.PublishDocumentRequest,
 *   !proto.PublishDocumentResponse>}
 */
const methodInfo_Documents_PublishDocument = new grpc.web.AbstractClientBase.MethodInfo(
  proto.PublishDocumentResponse,
  /**
   * @param {!proto.PublishDocumentRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.PublishDocumentResponse.deserializeBinary
);


/**
 * @param {!proto.PublishDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.PublishDocumentResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.PublishDocumentResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.DocumentsClient.prototype.publishDocument =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/Documents/PublishDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_PublishDocument,
      callback);
};


/**
 * @param {!proto.PublishDocumentRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.PublishDocumentResponse>}
 *     A native promise that resolves to the response
 */
proto.DocumentsPromiseClient.prototype.publishDocument =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/Documents/PublishDocument',
      request,
      metadata || {},
      methodDescriptor_Documents_PublishDocument);
};


module.exports = proto;

