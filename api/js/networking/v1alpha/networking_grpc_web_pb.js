/**
 * @fileoverview gRPC-Web generated client stub for com.mintter.networking.v1alpha
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.com = {};
proto.com.mintter = {};
proto.com.mintter.networking = {};
proto.com.mintter.networking.v1alpha = require('./networking_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.networking.v1alpha.NetworkingClient =
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
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient =
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
 *   !proto.com.mintter.networking.v1alpha.StartAccountDiscoveryRequest,
 *   !proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse>}
 */
const methodDescriptor_Networking_StartAccountDiscovery = new grpc.web.MethodDescriptor(
  '/com.mintter.networking.v1alpha.Networking/StartAccountDiscovery',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.networking.v1alpha.StartAccountDiscoveryRequest,
  proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.StartAccountDiscoveryRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.networking.v1alpha.StartAccountDiscoveryRequest,
 *   !proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse>}
 */
const methodInfo_Networking_StartAccountDiscovery = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.StartAccountDiscoveryRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.networking.v1alpha.StartAccountDiscoveryRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.networking.v1alpha.NetworkingClient.prototype.startAccountDiscovery =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/StartAccountDiscovery',
      request,
      metadata || {},
      methodDescriptor_Networking_StartAccountDiscovery,
      callback);
};


/**
 * @param {!proto.com.mintter.networking.v1alpha.StartAccountDiscoveryRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.networking.v1alpha.StartAccountDiscoveryResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient.prototype.startAccountDiscovery =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/StartAccountDiscovery',
      request,
      metadata || {},
      methodDescriptor_Networking_StartAccountDiscovery);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.networking.v1alpha.GetPeerAddrsRequest,
 *   !proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse>}
 */
const methodDescriptor_Networking_GetPeerAddrs = new grpc.web.MethodDescriptor(
  '/com.mintter.networking.v1alpha.Networking/GetPeerAddrs',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.networking.v1alpha.GetPeerAddrsRequest,
  proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.GetPeerAddrsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.networking.v1alpha.GetPeerAddrsRequest,
 *   !proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse>}
 */
const methodInfo_Networking_GetPeerAddrs = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.GetPeerAddrsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.networking.v1alpha.GetPeerAddrsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.networking.v1alpha.NetworkingClient.prototype.getPeerAddrs =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/GetPeerAddrs',
      request,
      metadata || {},
      methodDescriptor_Networking_GetPeerAddrs,
      callback);
};


/**
 * @param {!proto.com.mintter.networking.v1alpha.GetPeerAddrsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.networking.v1alpha.GetPeerAddrsResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient.prototype.getPeerAddrs =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/GetPeerAddrs',
      request,
      metadata || {},
      methodDescriptor_Networking_GetPeerAddrs);
};


module.exports = proto.com.mintter.networking.v1alpha;

