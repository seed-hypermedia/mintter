/**
 * @fileoverview gRPC-Web generated client stub for com.mintter.peer.v1alpha
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.com = {};
proto.com.mintter = {};
proto.com.mintter.peer = {};
proto.com.mintter.peer.v1alpha = require('./peer_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.peer.v1alpha.PeerClient =
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
proto.com.mintter.peer.v1alpha.PeerPromiseClient =
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
 *   !proto.com.mintter.peer.v1alpha.HandshakeInfo,
 *   !proto.com.mintter.peer.v1alpha.HandshakeInfo>}
 */
const methodDescriptor_Peer_Handshake = new grpc.web.MethodDescriptor(
  '/com.mintter.peer.v1alpha.Peer/Handshake',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.peer.v1alpha.HandshakeInfo,
  proto.com.mintter.peer.v1alpha.HandshakeInfo,
  /**
   * @param {!proto.com.mintter.peer.v1alpha.HandshakeInfo} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.peer.v1alpha.HandshakeInfo.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.peer.v1alpha.HandshakeInfo,
 *   !proto.com.mintter.peer.v1alpha.HandshakeInfo>}
 */
const methodInfo_Peer_Handshake = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.peer.v1alpha.HandshakeInfo,
  /**
   * @param {!proto.com.mintter.peer.v1alpha.HandshakeInfo} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.peer.v1alpha.HandshakeInfo.deserializeBinary
);


/**
 * @param {!proto.com.mintter.peer.v1alpha.HandshakeInfo} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.peer.v1alpha.HandshakeInfo)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.peer.v1alpha.HandshakeInfo>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.peer.v1alpha.PeerClient.prototype.handshake =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.peer.v1alpha.Peer/Handshake',
      request,
      metadata || {},
      methodDescriptor_Peer_Handshake,
      callback);
};


/**
 * @param {!proto.com.mintter.peer.v1alpha.HandshakeInfo} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.peer.v1alpha.HandshakeInfo>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.peer.v1alpha.PeerPromiseClient.prototype.handshake =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.peer.v1alpha.Peer/Handshake',
      request,
      metadata || {},
      methodDescriptor_Peer_Handshake);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.peer.v1alpha.PingRequest,
 *   !proto.com.mintter.peer.v1alpha.PingResponse>}
 */
const methodDescriptor_Peer_Ping = new grpc.web.MethodDescriptor(
  '/com.mintter.peer.v1alpha.Peer/Ping',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.peer.v1alpha.PingRequest,
  proto.com.mintter.peer.v1alpha.PingResponse,
  /**
   * @param {!proto.com.mintter.peer.v1alpha.PingRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.peer.v1alpha.PingResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.peer.v1alpha.PingRequest,
 *   !proto.com.mintter.peer.v1alpha.PingResponse>}
 */
const methodInfo_Peer_Ping = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.peer.v1alpha.PingResponse,
  /**
   * @param {!proto.com.mintter.peer.v1alpha.PingRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.peer.v1alpha.PingResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.peer.v1alpha.PingRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.peer.v1alpha.PingResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.peer.v1alpha.PingResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.peer.v1alpha.PeerClient.prototype.ping =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.peer.v1alpha.Peer/Ping',
      request,
      metadata || {},
      methodDescriptor_Peer_Ping,
      callback);
};


/**
 * @param {!proto.com.mintter.peer.v1alpha.PingRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.peer.v1alpha.PingResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.peer.v1alpha.PeerPromiseClient.prototype.ping =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.peer.v1alpha.Peer/Ping',
      request,
      metadata || {},
      methodDescriptor_Peer_Ping);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.peer.v1alpha.GetObjectVersionRequest,
 *   !proto.com.mintter.peer.v1alpha.Version>}
 */
const methodDescriptor_Peer_GetObjectVersion = new grpc.web.MethodDescriptor(
  '/com.mintter.peer.v1alpha.Peer/GetObjectVersion',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.peer.v1alpha.GetObjectVersionRequest,
  proto.com.mintter.peer.v1alpha.Version,
  /**
   * @param {!proto.com.mintter.peer.v1alpha.GetObjectVersionRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.peer.v1alpha.Version.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.peer.v1alpha.GetObjectVersionRequest,
 *   !proto.com.mintter.peer.v1alpha.Version>}
 */
const methodInfo_Peer_GetObjectVersion = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.peer.v1alpha.Version,
  /**
   * @param {!proto.com.mintter.peer.v1alpha.GetObjectVersionRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.peer.v1alpha.Version.deserializeBinary
);


/**
 * @param {!proto.com.mintter.peer.v1alpha.GetObjectVersionRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.peer.v1alpha.Version)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.peer.v1alpha.Version>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.peer.v1alpha.PeerClient.prototype.getObjectVersion =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.peer.v1alpha.Peer/GetObjectVersion',
      request,
      metadata || {},
      methodDescriptor_Peer_GetObjectVersion,
      callback);
};


/**
 * @param {!proto.com.mintter.peer.v1alpha.GetObjectVersionRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.peer.v1alpha.Version>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.peer.v1alpha.PeerPromiseClient.prototype.getObjectVersion =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.peer.v1alpha.Peer/GetObjectVersion',
      request,
      metadata || {},
      methodDescriptor_Peer_GetObjectVersion);
};


module.exports = proto.com.mintter.peer.v1alpha;

