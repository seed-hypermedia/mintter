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
 *   !proto.com.mintter.InitProfileRequest,
 *   !proto.com.mintter.InitProfileResponse>}
 */
const methodDescriptor_Mintter_InitProfile = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/InitProfile',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.InitProfileRequest,
  proto.com.mintter.InitProfileResponse,
  /**
   * @param {!proto.com.mintter.InitProfileRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.InitProfileResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.InitProfileRequest,
 *   !proto.com.mintter.InitProfileResponse>}
 */
const methodInfo_Mintter_InitProfile = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.InitProfileResponse,
  /**
   * @param {!proto.com.mintter.InitProfileRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.InitProfileResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.InitProfileRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.InitProfileResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.InitProfileResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.initProfile =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/InitProfile',
      request,
      metadata || {},
      methodDescriptor_Mintter_InitProfile,
      callback);
};


/**
 * @param {!proto.com.mintter.InitProfileRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.InitProfileResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.initProfile =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/InitProfile',
      request,
      metadata || {},
      methodDescriptor_Mintter_InitProfile);
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


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.ListProfilesRequest,
 *   !proto.com.mintter.ListProfilesResponse>}
 */
const methodDescriptor_Mintter_ListProfiles = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/ListProfiles',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.ListProfilesRequest,
  proto.com.mintter.ListProfilesResponse,
  /**
   * @param {!proto.com.mintter.ListProfilesRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListProfilesResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.ListProfilesRequest,
 *   !proto.com.mintter.ListProfilesResponse>}
 */
const methodInfo_Mintter_ListProfiles = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.ListProfilesResponse,
  /**
   * @param {!proto.com.mintter.ListProfilesRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListProfilesResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.ListProfilesRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.ListProfilesResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.ListProfilesResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.listProfiles =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/ListProfiles',
      request,
      metadata || {},
      methodDescriptor_Mintter_ListProfiles,
      callback);
};


/**
 * @param {!proto.com.mintter.ListProfilesRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.ListProfilesResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.listProfiles =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/ListProfiles',
      request,
      metadata || {},
      methodDescriptor_Mintter_ListProfiles);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.ListSuggestedProfilesRequest,
 *   !proto.com.mintter.ListSuggestedProfilesResponse>}
 */
const methodDescriptor_Mintter_ListSuggestedProfiles = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/ListSuggestedProfiles',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.ListSuggestedProfilesRequest,
  proto.com.mintter.ListSuggestedProfilesResponse,
  /**
   * @param {!proto.com.mintter.ListSuggestedProfilesRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListSuggestedProfilesResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.ListSuggestedProfilesRequest,
 *   !proto.com.mintter.ListSuggestedProfilesResponse>}
 */
const methodInfo_Mintter_ListSuggestedProfiles = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.ListSuggestedProfilesResponse,
  /**
   * @param {!proto.com.mintter.ListSuggestedProfilesRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ListSuggestedProfilesResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.ListSuggestedProfilesRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.ListSuggestedProfilesResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.ListSuggestedProfilesResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.listSuggestedProfiles =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/ListSuggestedProfiles',
      request,
      metadata || {},
      methodDescriptor_Mintter_ListSuggestedProfiles,
      callback);
};


/**
 * @param {!proto.com.mintter.ListSuggestedProfilesRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.ListSuggestedProfilesResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.listSuggestedProfiles =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/ListSuggestedProfiles',
      request,
      metadata || {},
      methodDescriptor_Mintter_ListSuggestedProfiles);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.GetProfileAddrsRequest,
 *   !proto.com.mintter.GetProfileAddrsResponse>}
 */
const methodDescriptor_Mintter_GetProfileAddrs = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/GetProfileAddrs',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.GetProfileAddrsRequest,
  proto.com.mintter.GetProfileAddrsResponse,
  /**
   * @param {!proto.com.mintter.GetProfileAddrsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.GetProfileAddrsResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.GetProfileAddrsRequest,
 *   !proto.com.mintter.GetProfileAddrsResponse>}
 */
const methodInfo_Mintter_GetProfileAddrs = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.GetProfileAddrsResponse,
  /**
   * @param {!proto.com.mintter.GetProfileAddrsRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.GetProfileAddrsResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.GetProfileAddrsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.GetProfileAddrsResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.GetProfileAddrsResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.getProfileAddrs =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/GetProfileAddrs',
      request,
      metadata || {},
      methodDescriptor_Mintter_GetProfileAddrs,
      callback);
};


/**
 * @param {!proto.com.mintter.GetProfileAddrsRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.GetProfileAddrsResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.getProfileAddrs =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/GetProfileAddrs',
      request,
      metadata || {},
      methodDescriptor_Mintter_GetProfileAddrs);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.com.mintter.ConnectToPeerRequest,
 *   !proto.com.mintter.ConnectToPeerResponse>}
 */
const methodDescriptor_Mintter_ConnectToPeer = new grpc.web.MethodDescriptor(
  '/com.mintter.Mintter/ConnectToPeer',
  grpc.web.MethodType.UNARY,
  proto.com.mintter.ConnectToPeerRequest,
  proto.com.mintter.ConnectToPeerResponse,
  /**
   * @param {!proto.com.mintter.ConnectToPeerRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ConnectToPeerResponse.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.com.mintter.ConnectToPeerRequest,
 *   !proto.com.mintter.ConnectToPeerResponse>}
 */
const methodInfo_Mintter_ConnectToPeer = new grpc.web.AbstractClientBase.MethodInfo(
  proto.com.mintter.ConnectToPeerResponse,
  /**
   * @param {!proto.com.mintter.ConnectToPeerRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.com.mintter.ConnectToPeerResponse.deserializeBinary
);


/**
 * @param {!proto.com.mintter.ConnectToPeerRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.com.mintter.ConnectToPeerResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.com.mintter.ConnectToPeerResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.com.mintter.MintterClient.prototype.connectToPeer =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Mintter/ConnectToPeer',
      request,
      metadata || {},
      methodDescriptor_Mintter_ConnectToPeer,
      callback);
};


/**
 * @param {!proto.com.mintter.ConnectToPeerRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.com.mintter.ConnectToPeerResponse>}
 *     A native promise that resolves to the response
 */
proto.com.mintter.MintterPromiseClient.prototype.connectToPeer =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Mintter/ConnectToPeer',
      request,
      metadata || {},
      methodDescriptor_Mintter_ConnectToPeer);
};


module.exports = proto.com.mintter;

