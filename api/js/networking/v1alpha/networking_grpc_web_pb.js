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
 *   !proto.com.mintter.networking.v1alpha.StartObjectDiscoveryRequest,
 *   !proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse>}
 */
const methodDescriptor_Networking_StartObjectDiscovery = new grpc.web.MethodDescriptor(
  '/com.mintter.networking.v1alpha.Networking/StartObjectDiscovery',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.networking.v1alpha.StartObjectDiscoveryRequest,
  proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.StartObjectDiscoveryRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.networking.v1alpha.StartObjectDiscoveryRequest,
 *   !proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse>}
 */
const methodInfo_Networking_StartObjectDiscovery = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.StartObjectDiscoveryRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.networking.v1alpha.StartObjectDiscoveryRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.networking.v1alpha.NetworkingClient.prototype.startObjectDiscovery =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/StartObjectDiscovery',
      request,
      metadata || {},
      methodDescriptor_Networking_StartObjectDiscovery,
      callback);
};


/**
 * @param {!proto.com.mintter.networking.v1alpha.StartObjectDiscoveryRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.networking.v1alpha.StartObjectDiscoveryResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient.prototype.startObjectDiscovery =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/StartObjectDiscovery',
      request,
      metadata || {},
      methodDescriptor_Networking_StartObjectDiscovery);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.networking.v1alpha.GetObjectDiscoveryStatusRequest,
 *   !proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus>}
 */
const methodDescriptor_Networking_GetObjectDiscoveryStatus = new grpc.web.MethodDescriptor(
  '/com.mintter.networking.v1alpha.Networking/GetObjectDiscoveryStatus',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.networking.v1alpha.GetObjectDiscoveryStatusRequest,
  proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.GetObjectDiscoveryStatusRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.networking.v1alpha.GetObjectDiscoveryStatusRequest,
 *   !proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus>}
 */
const methodInfo_Networking_GetObjectDiscoveryStatus = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.GetObjectDiscoveryStatusRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus.deserializeBinary
);


/**
 * @param {!proto.com.mintter.networking.v1alpha.GetObjectDiscoveryStatusRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.networking.v1alpha.NetworkingClient.prototype.getObjectDiscoveryStatus =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/GetObjectDiscoveryStatus',
      request,
      metadata || {},
      methodDescriptor_Networking_GetObjectDiscoveryStatus,
      callback);
};


/**
 * @param {!proto.com.mintter.networking.v1alpha.GetObjectDiscoveryStatusRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.networking.v1alpha.ObjectDiscoveryStatus>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient.prototype.getObjectDiscoveryStatus =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/GetObjectDiscoveryStatus',
      request,
      metadata || {},
      methodDescriptor_Networking_GetObjectDiscoveryStatus);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.networking.v1alpha.StopObjectDiscoveryRequest,
 *   !proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse>}
 */
const methodDescriptor_Networking_StopObjectDiscovery = new grpc.web.MethodDescriptor(
  '/com.mintter.networking.v1alpha.Networking/StopObjectDiscovery',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.networking.v1alpha.StopObjectDiscoveryRequest,
  proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.StopObjectDiscoveryRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.networking.v1alpha.StopObjectDiscoveryRequest,
 *   !proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse>}
 */
const methodInfo_Networking_StopObjectDiscovery = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.StopObjectDiscoveryRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.networking.v1alpha.StopObjectDiscoveryRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.networking.v1alpha.NetworkingClient.prototype.stopObjectDiscovery =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/StopObjectDiscovery',
      request,
      metadata || {},
      methodDescriptor_Networking_StopObjectDiscovery,
      callback);
};


/**
 * @param {!proto.com.mintter.networking.v1alpha.StopObjectDiscoveryRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.networking.v1alpha.StopObjectDiscoveryResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient.prototype.stopObjectDiscovery =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/StopObjectDiscovery',
      request,
      metadata || {},
      methodDescriptor_Networking_StopObjectDiscovery);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.networking.v1alpha.GetPeerInfoRequest,
 *   !proto.com.mintter.networking.v1alpha.PeerInfo>}
 */
const methodDescriptor_Networking_GetPeerInfo = new grpc.web.MethodDescriptor(
  '/com.mintter.networking.v1alpha.Networking/GetPeerInfo',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.networking.v1alpha.GetPeerInfoRequest,
  proto.com.mintter.networking.v1alpha.PeerInfo,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.GetPeerInfoRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.PeerInfo.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.networking.v1alpha.GetPeerInfoRequest,
 *   !proto.com.mintter.networking.v1alpha.PeerInfo>}
 */
const methodInfo_Networking_GetPeerInfo = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.networking.v1alpha.PeerInfo,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.GetPeerInfoRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.PeerInfo.deserializeBinary
);


/**
 * @param {!proto.com.mintter.networking.v1alpha.GetPeerInfoRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.networking.v1alpha.PeerInfo)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.networking.v1alpha.PeerInfo>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.networking.v1alpha.NetworkingClient.prototype.getPeerInfo =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/GetPeerInfo',
      request,
      metadata || {},
      methodDescriptor_Networking_GetPeerInfo,
      callback);
};


/**
 * @param {!proto.com.mintter.networking.v1alpha.GetPeerInfoRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.networking.v1alpha.PeerInfo>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient.prototype.getPeerInfo =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/GetPeerInfo',
      request,
      metadata || {},
      methodDescriptor_Networking_GetPeerInfo);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.networking.v1alpha.ConnectRequest,
 *   !proto.com.mintter.networking.v1alpha.ConnectResponse>}
 */
const methodDescriptor_Networking_Connect = new grpc.web.MethodDescriptor(
  '/com.mintter.networking.v1alpha.Networking/Connect',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.networking.v1alpha.ConnectRequest,
  proto.com.mintter.networking.v1alpha.ConnectResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.ConnectRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.ConnectResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.networking.v1alpha.ConnectRequest,
 *   !proto.com.mintter.networking.v1alpha.ConnectResponse>}
 */
const methodInfo_Networking_Connect = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.networking.v1alpha.ConnectResponse,
  /**
   * @param {!proto.com.mintter.networking.v1alpha.ConnectRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.networking.v1alpha.ConnectResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.networking.v1alpha.ConnectRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.networking.v1alpha.ConnectResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.networking.v1alpha.ConnectResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.networking.v1alpha.NetworkingClient.prototype.connect =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/Connect',
      request,
      metadata || {},
      methodDescriptor_Networking_Connect,
      callback);
};


/**
 * @param {!proto.com.mintter.networking.v1alpha.ConnectRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.networking.v1alpha.ConnectResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.networking.v1alpha.NetworkingPromiseClient.prototype.connect =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.networking.v1alpha.Networking/Connect',
      request,
      metadata || {},
      methodDescriptor_Networking_Connect);
};


module.exports = proto.com.mintter.networking.v1alpha;

