/**
 * @fileoverview gRPC-Web generated client stub for com.mintter.documents.v1alpha
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');


var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js')

var documents_v1alpha_resources_pb = require('../../documents/v1alpha/resources_pb.js')
const proto = {};
proto.com = {};
proto.com.mintter = {};
proto.com.mintter.documents = {};
proto.com.mintter.documents.v1alpha = require('./services_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.documents.v1alpha.DraftsClient =
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
proto.com.mintter.documents.v1alpha.DraftsPromiseClient =
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
 *   !proto.com.mintter.documents.v1alpha.CreateDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.Document>}
 */
const methodDescriptor_Drafts_CreateDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Drafts/CreateDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.CreateDraftRequest,
  documents_v1alpha_resources_pb.Document,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  documents_v1alpha_resources_pb.Document.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.documents.v1alpha.CreateDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.Document>}
 */
const methodInfo_Drafts_CreateDraft = new grpc.web.AbstractClientBase.MethodInfo(
  documents_v1alpha_resources_pb.Document,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  documents_v1alpha_resources_pb.Document.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.documents.v1alpha.Document)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.documents.v1alpha.Document>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.DraftsClient.prototype.createDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_CreateDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.documents.v1alpha.Document>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.DraftsPromiseClient.prototype.createDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_CreateDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.documents.v1alpha.DeleteDraftRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodDescriptor_Drafts_DeleteDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Drafts/DeleteDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.DeleteDraftRequest,
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.DeleteDraftRequest} request
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
 *   !proto.com.mintter.documents.v1alpha.DeleteDraftRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodInfo_Drafts_DeleteDraft = new grpc.web.AbstractClientBase.MethodInfo(
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.DeleteDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  google_protobuf_empty_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.DeleteDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.google.protobuf.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.google.protobuf.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.DraftsClient.prototype.deleteDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/DeleteDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_DeleteDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.DeleteDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.google.protobuf.Empty>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.DraftsPromiseClient.prototype.deleteDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/DeleteDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_DeleteDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.documents.v1alpha.GetDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.Document>}
 */
const methodDescriptor_Drafts_GetDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Drafts/GetDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.GetDraftRequest,
  documents_v1alpha_resources_pb.Document,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.GetDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  documents_v1alpha_resources_pb.Document.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.documents.v1alpha.GetDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.Document>}
 */
const methodInfo_Drafts_GetDraft = new grpc.web.AbstractClientBase.MethodInfo(
  documents_v1alpha_resources_pb.Document,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.GetDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  documents_v1alpha_resources_pb.Document.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.GetDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.documents.v1alpha.Document)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.documents.v1alpha.Document>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.DraftsClient.prototype.getDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/GetDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_GetDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.GetDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.documents.v1alpha.Document>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.DraftsPromiseClient.prototype.getDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/GetDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_GetDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.documents.v1alpha.UpdateDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.UpdateDraftResponse>}
 */
const methodDescriptor_Drafts_UpdateDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Drafts/UpdateDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.UpdateDraftRequest,
  proto.com.mintter.documents.v1alpha.UpdateDraftResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.UpdateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.UpdateDraftResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.documents.v1alpha.UpdateDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.UpdateDraftResponse>}
 */
const methodInfo_Drafts_UpdateDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.documents.v1alpha.UpdateDraftResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.UpdateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.UpdateDraftResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.UpdateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.documents.v1alpha.UpdateDraftResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.documents.v1alpha.UpdateDraftResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.DraftsClient.prototype.updateDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/UpdateDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_UpdateDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.UpdateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.documents.v1alpha.UpdateDraftResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.DraftsPromiseClient.prototype.updateDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/UpdateDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_UpdateDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.documents.v1alpha.ListDraftsRequest,
 *   !proto.com.mintter.documents.v1alpha.ListDraftsResponse>}
 */
const methodDescriptor_Drafts_ListDrafts = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Drafts/ListDrafts',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.ListDraftsRequest,
  proto.com.mintter.documents.v1alpha.ListDraftsResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.ListDraftsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.ListDraftsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.documents.v1alpha.ListDraftsRequest,
 *   !proto.com.mintter.documents.v1alpha.ListDraftsResponse>}
 */
const methodInfo_Drafts_ListDrafts = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.documents.v1alpha.ListDraftsResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.ListDraftsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.ListDraftsResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.ListDraftsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.documents.v1alpha.ListDraftsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.documents.v1alpha.ListDraftsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.DraftsClient.prototype.listDrafts =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/ListDrafts',
      request,
      metadata || {},
      methodDescriptor_Drafts_ListDrafts,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.ListDraftsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.documents.v1alpha.ListDraftsResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.DraftsPromiseClient.prototype.listDrafts =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/ListDrafts',
      request,
      metadata || {},
      methodDescriptor_Drafts_ListDrafts);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.documents.v1alpha.PublishDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.PublishDraftResponse>}
 */
const methodDescriptor_Drafts_PublishDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Drafts/PublishDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.PublishDraftRequest,
  proto.com.mintter.documents.v1alpha.PublishDraftResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.PublishDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.PublishDraftResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.documents.v1alpha.PublishDraftRequest,
 *   !proto.com.mintter.documents.v1alpha.PublishDraftResponse>}
 */
const methodInfo_Drafts_PublishDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.documents.v1alpha.PublishDraftResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.PublishDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.PublishDraftResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.PublishDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.documents.v1alpha.PublishDraftResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.documents.v1alpha.PublishDraftResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.DraftsClient.prototype.publishDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/PublishDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_PublishDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.PublishDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.documents.v1alpha.PublishDraftResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.DraftsPromiseClient.prototype.publishDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Drafts/PublishDraft',
      request,
      metadata || {},
      methodDescriptor_Drafts_PublishDraft);
};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.documents.v1alpha.PublicationsClient =
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
proto.com.mintter.documents.v1alpha.PublicationsPromiseClient =
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
 *   !proto.com.mintter.documents.v1alpha.GetPublicationRequest,
 *   !proto.com.mintter.documents.v1alpha.Publication>}
 */
const methodDescriptor_Publications_GetPublication = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Publications/GetPublication',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.GetPublicationRequest,
  documents_v1alpha_resources_pb.Publication,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.GetPublicationRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  documents_v1alpha_resources_pb.Publication.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.documents.v1alpha.GetPublicationRequest,
 *   !proto.com.mintter.documents.v1alpha.Publication>}
 */
const methodInfo_Publications_GetPublication = new grpc.web.AbstractClientBase.MethodInfo(
  documents_v1alpha_resources_pb.Publication,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.GetPublicationRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  documents_v1alpha_resources_pb.Publication.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.GetPublicationRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.documents.v1alpha.Publication)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.documents.v1alpha.Publication>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.PublicationsClient.prototype.getPublication =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Publications/GetPublication',
      request,
      metadata || {},
      methodDescriptor_Publications_GetPublication,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.GetPublicationRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.documents.v1alpha.Publication>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.PublicationsPromiseClient.prototype.getPublication =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Publications/GetPublication',
      request,
      metadata || {},
      methodDescriptor_Publications_GetPublication);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.documents.v1alpha.DeletePublicationRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodDescriptor_Publications_DeletePublication = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Publications/DeletePublication',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.DeletePublicationRequest,
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.DeletePublicationRequest} request
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
 *   !proto.com.mintter.documents.v1alpha.DeletePublicationRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodInfo_Publications_DeletePublication = new grpc.web.AbstractClientBase.MethodInfo(
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.DeletePublicationRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  google_protobuf_empty_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.DeletePublicationRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.google.protobuf.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.google.protobuf.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.PublicationsClient.prototype.deletePublication =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Publications/DeletePublication',
      request,
      metadata || {},
      methodDescriptor_Publications_DeletePublication,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.DeletePublicationRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.google.protobuf.Empty>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.PublicationsPromiseClient.prototype.deletePublication =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Publications/DeletePublication',
      request,
      metadata || {},
      methodDescriptor_Publications_DeletePublication);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.documents.v1alpha.ListPublicationsRequest,
 *   !proto.com.mintter.documents.v1alpha.ListPublicationsResponse>}
 */
const methodDescriptor_Publications_ListPublications = new grpc.web.MethodDescriptor(
  '/com.mintter.documents.v1alpha.Publications/ListPublications',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.documents.v1alpha.ListPublicationsRequest,
  proto.com.mintter.documents.v1alpha.ListPublicationsResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.ListPublicationsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.ListPublicationsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.documents.v1alpha.ListPublicationsRequest,
 *   !proto.com.mintter.documents.v1alpha.ListPublicationsResponse>}
 */
const methodInfo_Publications_ListPublications = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.documents.v1alpha.ListPublicationsResponse,
  /**
   * @param {!proto.com.mintter.documents.v1alpha.ListPublicationsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.documents.v1alpha.ListPublicationsResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.documents.v1alpha.ListPublicationsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.documents.v1alpha.ListPublicationsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.documents.v1alpha.ListPublicationsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.documents.v1alpha.PublicationsClient.prototype.listPublications =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Publications/ListPublications',
      request,
      metadata || {},
      methodDescriptor_Publications_ListPublications,
      callback);
};


/**
 * @param {!proto.com.mintter.documents.v1alpha.ListPublicationsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.documents.v1alpha.ListPublicationsResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.documents.v1alpha.PublicationsPromiseClient.prototype.listPublications =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.documents.v1alpha.Publications/ListPublications',
      request,
      metadata || {},
      methodDescriptor_Publications_ListPublications);
};


module.exports = proto.com.mintter.documents.v1alpha;

