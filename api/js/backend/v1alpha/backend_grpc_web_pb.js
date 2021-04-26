/**
 * @fileoverview gRPC-Web generated client stub for com.mintter.backend.v1alpha
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.com = {};
proto.com.mintter = {};
proto.com.mintter.backend = {};
proto.com.mintter.backend.v1alpha = require('./backend_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.backend.v1alpha.BackendClient =
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
proto.com.mintter.backend.v1alpha.BackendPromiseClient =
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
 *   !proto.com.mintter.backend.v1alpha.GenSeedRequest,
 *   !proto.com.mintter.backend.v1alpha.GenSeedResponse>}
 */
const methodDescriptor_Backend_GenSeed = new grpc.web.MethodDescriptor(
  '/com.mintter.backend.v1alpha.Backend/GenSeed',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.backend.v1alpha.GenSeedRequest,
  proto.com.mintter.backend.v1alpha.GenSeedResponse,
  /**
   * @param {!proto.com.mintter.backend.v1alpha.GenSeedRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.backend.v1alpha.GenSeedResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.backend.v1alpha.GenSeedRequest,
 *   !proto.com.mintter.backend.v1alpha.GenSeedResponse>}
 */
const methodInfo_Backend_GenSeed = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.backend.v1alpha.GenSeedResponse,
  /**
   * @param {!proto.com.mintter.backend.v1alpha.GenSeedRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.backend.v1alpha.GenSeedResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.backend.v1alpha.GenSeedRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.backend.v1alpha.GenSeedResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.backend.v1alpha.GenSeedResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.backend.v1alpha.BackendClient.prototype.genSeed =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.backend.v1alpha.Backend/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Backend_GenSeed,
      callback);
};


/**
 * @param {!proto.com.mintter.backend.v1alpha.GenSeedRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.backend.v1alpha.GenSeedResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.backend.v1alpha.BackendPromiseClient.prototype.genSeed =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.backend.v1alpha.Backend/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Backend_GenSeed);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.backend.v1alpha.BindAccountRequest,
 *   !proto.com.mintter.backend.v1alpha.BindAccountResponse>}
 */
const methodDescriptor_Backend_BindAccount = new grpc.web.MethodDescriptor(
  '/com.mintter.backend.v1alpha.Backend/BindAccount',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.backend.v1alpha.BindAccountRequest,
  proto.com.mintter.backend.v1alpha.BindAccountResponse,
  /**
   * @param {!proto.com.mintter.backend.v1alpha.BindAccountRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.backend.v1alpha.BindAccountResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.backend.v1alpha.BindAccountRequest,
 *   !proto.com.mintter.backend.v1alpha.BindAccountResponse>}
 */
const methodInfo_Backend_BindAccount = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.backend.v1alpha.BindAccountResponse,
  /**
   * @param {!proto.com.mintter.backend.v1alpha.BindAccountRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.backend.v1alpha.BindAccountResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.backend.v1alpha.BindAccountRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.backend.v1alpha.BindAccountResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.backend.v1alpha.BindAccountResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.backend.v1alpha.BackendClient.prototype.bindAccount =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.backend.v1alpha.Backend/BindAccount',
      request,
      metadata || {},
      methodDescriptor_Backend_BindAccount,
      callback);
};


/**
 * @param {!proto.com.mintter.backend.v1alpha.BindAccountRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.backend.v1alpha.BindAccountResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.backend.v1alpha.BackendPromiseClient.prototype.bindAccount =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.backend.v1alpha.Backend/BindAccount',
      request,
      metadata || {},
      methodDescriptor_Backend_BindAccount);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.backend.v1alpha.DialPeerRequest,
 *   !proto.com.mintter.backend.v1alpha.DialPeerResponse>}
 */
const methodDescriptor_Backend_DialPeer = new grpc.web.MethodDescriptor(
  '/com.mintter.backend.v1alpha.Backend/DialPeer',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.backend.v1alpha.DialPeerRequest,
  proto.com.mintter.backend.v1alpha.DialPeerResponse,
  /**
   * @param {!proto.com.mintter.backend.v1alpha.DialPeerRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.backend.v1alpha.DialPeerResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.backend.v1alpha.DialPeerRequest,
 *   !proto.com.mintter.backend.v1alpha.DialPeerResponse>}
 */
const methodInfo_Backend_DialPeer = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.backend.v1alpha.DialPeerResponse,
  /**
   * @param {!proto.com.mintter.backend.v1alpha.DialPeerRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.backend.v1alpha.DialPeerResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.backend.v1alpha.DialPeerRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.backend.v1alpha.DialPeerResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.backend.v1alpha.DialPeerResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.backend.v1alpha.BackendClient.prototype.dialPeer =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.backend.v1alpha.Backend/DialPeer',
      request,
      metadata || {},
      methodDescriptor_Backend_DialPeer,
      callback);
};


/**
 * @param {!proto.com.mintter.backend.v1alpha.DialPeerRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.backend.v1alpha.DialPeerResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.backend.v1alpha.BackendPromiseClient.prototype.dialPeer =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.backend.v1alpha.Backend/DialPeer',
      request,
      metadata || {},
      methodDescriptor_Backend_DialPeer);
};


module.exports = proto.com.mintter.backend.v1alpha;

