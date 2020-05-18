/**
 * @fileoverview gRPC-Web generated client stub for com.mintter
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');


var google_protobuf_timestamp_pb = require('google-protobuf/google/protobuf/timestamp_pb.js')

var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js')
const proto = {};
proto.com = {};
proto.com.mintter = require('./documents_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.DocumentsClient =
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
proto.com.mintter.DocumentsPromiseClient =
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
 *   !proto.com.mintter.CreateDraftRequest,
 *   !proto.com.mintter.Draft>}
 */
const methodDescriptor_Documents_CreateDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/CreateDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.CreateDraftRequest,
  proto.com.mintter.Draft,
  /**
   * @param {!proto.com.mintter.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Draft.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.CreateDraftRequest,
 *   !proto.com.mintter.Draft>}
 */
const methodInfo_Documents_CreateDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.Draft,
  /**
   * @param {!proto.com.mintter.CreateDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Draft.deserializeBinary
);


/**
 * @param {!proto.com.mintter.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.Draft)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.Draft>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.createDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_CreateDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.CreateDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.Draft>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.createDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/CreateDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_CreateDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.GetDraftRequest,
 *   !proto.com.mintter.Draft>}
 */
const methodDescriptor_Documents_GetDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/GetDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.GetDraftRequest,
  proto.com.mintter.Draft,
  /**
   * @param {!proto.com.mintter.GetDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Draft.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.GetDraftRequest,
 *   !proto.com.mintter.Draft>}
 */
const methodInfo_Documents_GetDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.Draft,
  /**
   * @param {!proto.com.mintter.GetDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Draft.deserializeBinary
);


/**
 * @param {!proto.com.mintter.GetDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.Draft)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.Draft>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.getDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/GetDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_GetDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.GetDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.Draft>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.getDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/GetDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_GetDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.ListDraftsRequest,
 *   !proto.com.mintter.ListDraftsResponse>}
 */
const methodDescriptor_Documents_ListDrafts = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/ListDrafts',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.ListDraftsRequest,
  proto.com.mintter.ListDraftsResponse,
  /**
   * @param {!proto.com.mintter.ListDraftsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListDraftsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.ListDraftsRequest,
 *   !proto.com.mintter.ListDraftsResponse>}
 */
const methodInfo_Documents_ListDrafts = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.ListDraftsResponse,
  /**
   * @param {!proto.com.mintter.ListDraftsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListDraftsResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.ListDraftsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.ListDraftsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.ListDraftsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.listDrafts =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/ListDrafts',
      request,
      metadata || {},
      methodDescriptor_Documents_ListDrafts,
      callback);
};


/**
 * @param {!proto.com.mintter.ListDraftsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.ListDraftsResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.listDrafts =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/ListDrafts',
      request,
      metadata || {},
      methodDescriptor_Documents_ListDrafts);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.Draft,
 *   !proto.com.mintter.Draft>}
 */
const methodDescriptor_Documents_SaveDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/SaveDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.Draft,
  proto.com.mintter.Draft,
  /**
   * @param {!proto.com.mintter.Draft} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Draft.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.Draft,
 *   !proto.com.mintter.Draft>}
 */
const methodInfo_Documents_SaveDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.Draft,
  /**
   * @param {!proto.com.mintter.Draft} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Draft.deserializeBinary
);


/**
 * @param {!proto.com.mintter.Draft} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.Draft)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.Draft>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.saveDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/SaveDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_SaveDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.Draft} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.Draft>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.saveDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/SaveDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_SaveDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.DeleteDraftRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodDescriptor_Documents_DeleteDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/DeleteDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.DeleteDraftRequest,
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.com.mintter.DeleteDraftRequest} request
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
 *   !proto.com.mintter.DeleteDraftRequest,
 *   !proto.google.protobuf.Empty>}
 */
const methodInfo_Documents_DeleteDraft = new grpc.web.AbstractClientBase.MethodInfo(
  google_protobuf_empty_pb.Empty,
  /**
   * @param {!proto.com.mintter.DeleteDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  google_protobuf_empty_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.com.mintter.DeleteDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.google.protobuf.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.google.protobuf.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.deleteDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/DeleteDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_DeleteDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.DeleteDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.google.protobuf.Empty>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.deleteDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/DeleteDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_DeleteDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.PublishDraftRequest,
 *   !proto.com.mintter.Publication>}
 */
const methodDescriptor_Documents_PublishDraft = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/PublishDraft',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.PublishDraftRequest,
  proto.com.mintter.Publication,
  /**
   * @param {!proto.com.mintter.PublishDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Publication.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.PublishDraftRequest,
 *   !proto.com.mintter.Publication>}
 */
const methodInfo_Documents_PublishDraft = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.Publication,
  /**
   * @param {!proto.com.mintter.PublishDraftRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Publication.deserializeBinary
);


/**
 * @param {!proto.com.mintter.PublishDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.Publication)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.Publication>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.publishDraft =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/PublishDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_PublishDraft,
      callback);
};


/**
 * @param {!proto.com.mintter.PublishDraftRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.Publication>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.publishDraft =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/PublishDraft',
      request,
      metadata || {},
      methodDescriptor_Documents_PublishDraft);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.ListPublicationsRequest,
 *   !proto.com.mintter.ListPublicationsResponse>}
 */
const methodDescriptor_Documents_ListPublications = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/ListPublications',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.ListPublicationsRequest,
  proto.com.mintter.ListPublicationsResponse,
  /**
   * @param {!proto.com.mintter.ListPublicationsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListPublicationsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.ListPublicationsRequest,
 *   !proto.com.mintter.ListPublicationsResponse>}
 */
const methodInfo_Documents_ListPublications = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.ListPublicationsResponse,
  /**
   * @param {!proto.com.mintter.ListPublicationsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListPublicationsResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.ListPublicationsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.ListPublicationsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.ListPublicationsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.listPublications =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/ListPublications',
      request,
      metadata || {},
      methodDescriptor_Documents_ListPublications,
      callback);
};


/**
 * @param {!proto.com.mintter.ListPublicationsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.ListPublicationsResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.listPublications =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/ListPublications',
      request,
      metadata || {},
      methodDescriptor_Documents_ListPublications);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.GetSectionRequest,
 *   !proto.com.mintter.Section>}
 */
const methodDescriptor_Documents_GetSection = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/GetSection',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.GetSectionRequest,
  proto.com.mintter.Section,
  /**
   * @param {!proto.com.mintter.GetSectionRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Section.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.GetSectionRequest,
 *   !proto.com.mintter.Section>}
 */
const methodInfo_Documents_GetSection = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.Section,
  /**
   * @param {!proto.com.mintter.GetSectionRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.Section.deserializeBinary
);


/**
 * @param {!proto.com.mintter.GetSectionRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.Section)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.Section>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.getSection =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/GetSection',
      request,
      metadata || {},
      methodDescriptor_Documents_GetSection,
      callback);
};


/**
 * @param {!proto.com.mintter.GetSectionRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.Section>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.getSection =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/GetSection',
      request,
      metadata || {},
      methodDescriptor_Documents_GetSection);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.BatchGetSectionsRequest,
 *   !proto.com.mintter.BatchGetSectionsResponse>}
 */
const methodDescriptor_Documents_BatchGetSections = new grpc.web.MethodDescriptor(
  '/com.mintter.Documents/BatchGetSections',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.BatchGetSectionsRequest,
  proto.com.mintter.BatchGetSectionsResponse,
  /**
   * @param {!proto.com.mintter.BatchGetSectionsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.BatchGetSectionsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.BatchGetSectionsRequest,
 *   !proto.com.mintter.BatchGetSectionsResponse>}
 */
const methodInfo_Documents_BatchGetSections = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.BatchGetSectionsResponse,
  /**
   * @param {!proto.com.mintter.BatchGetSectionsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.BatchGetSectionsResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.BatchGetSectionsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.BatchGetSectionsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.BatchGetSectionsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.DocumentsClient.prototype.batchGetSections =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Documents/BatchGetSections',
      request,
      metadata || {},
      methodDescriptor_Documents_BatchGetSections,
      callback);
};


/**
 * @param {!proto.com.mintter.BatchGetSectionsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.BatchGetSectionsResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.DocumentsPromiseClient.prototype.batchGetSections =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Documents/BatchGetSections',
      request,
      metadata || {},
      methodDescriptor_Documents_BatchGetSections);
};


module.exports = proto.com.mintter;

