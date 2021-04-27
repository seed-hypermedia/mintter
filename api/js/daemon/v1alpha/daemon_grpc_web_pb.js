/**
 * @fileoverview gRPC-Web generated client stub for com.mintter.daemon.v1alpha
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.com = {};
proto.com.mintter = {};
proto.com.mintter.daemon = {};
proto.com.mintter.daemon.v1alpha = require('./daemon_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.daemon.v1alpha.DaemonClient =
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
proto.com.mintter.daemon.v1alpha.DaemonPromiseClient =
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
 *   !proto.com.mintter.daemon.v1alpha.GenSeedRequest,
 *   !proto.com.mintter.daemon.v1alpha.GenSeedResponse>}
 */
const methodDescriptor_Daemon_GenSeed = new grpc.web.MethodDescriptor(
  '/com.mintter.daemon.v1alpha.Daemon/GenSeed',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.daemon.v1alpha.GenSeedRequest,
  proto.com.mintter.daemon.v1alpha.GenSeedResponse,
  /**
   * @param {!proto.com.mintter.daemon.v1alpha.GenSeedRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.daemon.v1alpha.GenSeedResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.daemon.v1alpha.GenSeedRequest,
 *   !proto.com.mintter.daemon.v1alpha.GenSeedResponse>}
 */
const methodInfo_Daemon_GenSeed = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.daemon.v1alpha.GenSeedResponse,
  /**
   * @param {!proto.com.mintter.daemon.v1alpha.GenSeedRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.daemon.v1alpha.GenSeedResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.daemon.v1alpha.GenSeedRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.daemon.v1alpha.GenSeedResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.daemon.v1alpha.GenSeedResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.daemon.v1alpha.DaemonClient.prototype.genSeed =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.daemon.v1alpha.Daemon/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Daemon_GenSeed,
      callback);
};


/**
 * @param {!proto.com.mintter.daemon.v1alpha.GenSeedRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.daemon.v1alpha.GenSeedResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.daemon.v1alpha.DaemonPromiseClient.prototype.genSeed =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.daemon.v1alpha.Daemon/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Daemon_GenSeed);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.daemon.v1alpha.RegisterRequest,
 *   !proto.com.mintter.daemon.v1alpha.RegisterResponse>}
 */
const methodDescriptor_Daemon_Register = new grpc.web.MethodDescriptor(
  '/com.mintter.daemon.v1alpha.Daemon/Register',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.daemon.v1alpha.RegisterRequest,
  proto.com.mintter.daemon.v1alpha.RegisterResponse,
  /**
   * @param {!proto.com.mintter.daemon.v1alpha.RegisterRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.daemon.v1alpha.RegisterResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.daemon.v1alpha.RegisterRequest,
 *   !proto.com.mintter.daemon.v1alpha.RegisterResponse>}
 */
const methodInfo_Daemon_Register = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.daemon.v1alpha.RegisterResponse,
  /**
   * @param {!proto.com.mintter.daemon.v1alpha.RegisterRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.daemon.v1alpha.RegisterResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.daemon.v1alpha.RegisterRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.daemon.v1alpha.RegisterResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.daemon.v1alpha.RegisterResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.daemon.v1alpha.DaemonClient.prototype.register =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.daemon.v1alpha.Daemon/Register',
      request,
      metadata || {},
      methodDescriptor_Daemon_Register,
      callback);
};


/**
 * @param {!proto.com.mintter.daemon.v1alpha.RegisterRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.daemon.v1alpha.RegisterResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.daemon.v1alpha.DaemonPromiseClient.prototype.register =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.daemon.v1alpha.Daemon/Register',
      request,
      metadata || {},
      methodDescriptor_Daemon_Register);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.daemon.v1alpha.DialPeerRequest,
 *   !proto.com.mintter.daemon.v1alpha.DialPeerResponse>}
 */
const methodDescriptor_Daemon_DialPeer = new grpc.web.MethodDescriptor(
  '/com.mintter.daemon.v1alpha.Daemon/DialPeer',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.daemon.v1alpha.DialPeerRequest,
  proto.com.mintter.daemon.v1alpha.DialPeerResponse,
  /**
   * @param {!proto.com.mintter.daemon.v1alpha.DialPeerRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.daemon.v1alpha.DialPeerResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.daemon.v1alpha.DialPeerRequest,
 *   !proto.com.mintter.daemon.v1alpha.DialPeerResponse>}
 */
const methodInfo_Daemon_DialPeer = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.daemon.v1alpha.DialPeerResponse,
  /**
   * @param {!proto.com.mintter.daemon.v1alpha.DialPeerRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.daemon.v1alpha.DialPeerResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.daemon.v1alpha.DialPeerRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.daemon.v1alpha.DialPeerResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.daemon.v1alpha.DialPeerResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.daemon.v1alpha.DaemonClient.prototype.dialPeer =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.daemon.v1alpha.Daemon/DialPeer',
      request,
      metadata || {},
      methodDescriptor_Daemon_DialPeer,
      callback);
};


/**
 * @param {!proto.com.mintter.daemon.v1alpha.DialPeerRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.daemon.v1alpha.DialPeerResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.daemon.v1alpha.DaemonPromiseClient.prototype.dialPeer =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.daemon.v1alpha.Daemon/DialPeer',
      request,
      metadata || {},
      methodDescriptor_Daemon_DialPeer);
};


module.exports = proto.com.mintter.daemon.v1alpha;

