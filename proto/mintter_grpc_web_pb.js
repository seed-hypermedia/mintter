/**
 * @fileoverview gRPC-Web generated client stub for com.mintter
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.com = {};
proto.com.mintter = require('./mintter_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.com.mintter.MintterClient =
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
proto.com.mintter.MintterPromiseClient =
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
 *   !proto.com.mintter.GenSeedRequest,
 *   !proto.com.mintter.GenSeedResponse>}
 */
const methodDescriptor_Mintter_GenSeed = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/GenSeed',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.GenSeedRequest,
  proto.com.mintter.GenSeedResponse,
  /**
   * @param {!proto.com.mintter.GenSeedRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.GenSeedResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.GenSeedRequest,
 *   !proto.com.mintter.GenSeedResponse>}
 */
const methodInfo_Mintter_GenSeed = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.GenSeedResponse,
  /**
   * @param {!proto.com.mintter.GenSeedRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.GenSeedResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.GenSeedRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.GenSeedResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.GenSeedResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.genSeed =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Mintter_GenSeed,
      callback);
};


/**
 * @param {!proto.com.mintter.GenSeedRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.GenSeedResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.genSeed =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Mintter_GenSeed);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.InitWalletRequest,
 *   !proto.com.mintter.InitWalletResponse>}
 */
const methodDescriptor_Mintter_InitWallet = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/InitWallet',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.InitWalletRequest,
  proto.com.mintter.InitWalletResponse,
  /**
   * @param {!proto.com.mintter.InitWalletRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.InitWalletResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.InitWalletRequest,
 *   !proto.com.mintter.InitWalletResponse>}
 */
const methodInfo_Mintter_InitWallet = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.InitWalletResponse,
  /**
   * @param {!proto.com.mintter.InitWalletRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.InitWalletResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.InitWalletRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.InitWalletResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.InitWalletResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.initWallet =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/InitWallet',
      request,
      metadata || {},
      methodDescriptor_Mintter_InitWallet,
      callback);
};


/**
 * @param {!proto.com.mintter.InitWalletRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.InitWalletResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.initWallet =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/InitWallet',
      request,
      metadata || {},
      methodDescriptor_Mintter_InitWallet);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.GetProfileRequest,
 *   !proto.com.mintter.GetProfileResponse>}
 */
const methodDescriptor_Mintter_GetProfile = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/GetProfile',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.GetProfileRequest,
  proto.com.mintter.GetProfileResponse,
  /**
   * @param {!proto.com.mintter.GetProfileRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.GetProfileResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.GetProfileRequest,
 *   !proto.com.mintter.GetProfileResponse>}
 */
const methodInfo_Mintter_GetProfile = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.GetProfileResponse,
  /**
   * @param {!proto.com.mintter.GetProfileRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.GetProfileResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.GetProfileRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.GetProfileResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.GetProfileResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.getProfile =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/GetProfile',
      request,
      metadata || {},
      methodDescriptor_Mintter_GetProfile,
      callback);
};


/**
 * @param {!proto.com.mintter.GetProfileRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.GetProfileResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.getProfile =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/GetProfile',
      request,
      metadata || {},
      methodDescriptor_Mintter_GetProfile);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.UpdateProfileRequest,
 *   !proto.com.mintter.UpdateProfileResponse>}
 */
const methodDescriptor_Mintter_UpdateProfile = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/UpdateProfile',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.UpdateProfileRequest,
  proto.com.mintter.UpdateProfileResponse,
  /**
   * @param {!proto.com.mintter.UpdateProfileRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.UpdateProfileResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.UpdateProfileRequest,
 *   !proto.com.mintter.UpdateProfileResponse>}
 */
const methodInfo_Mintter_UpdateProfile = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.UpdateProfileResponse,
  /**
   * @param {!proto.com.mintter.UpdateProfileRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.UpdateProfileResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.UpdateProfileRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.UpdateProfileResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.UpdateProfileResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.updateProfile =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/UpdateProfile',
      request,
      metadata || {},
      methodDescriptor_Mintter_UpdateProfile,
      callback);
};


/**
 * @param {!proto.com.mintter.UpdateProfileRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.UpdateProfileResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.updateProfile =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/UpdateProfile',
      request,
      metadata || {},
      methodDescriptor_Mintter_UpdateProfile);
};


module.exports = proto.com.mintter;

