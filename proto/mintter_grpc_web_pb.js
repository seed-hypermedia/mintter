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
proto.com.mintter.AccountsClient =
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
proto.com.mintter.AccountsPromiseClient =
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
const methodDescriptor_Accounts_GenSeed = new grpc.web.MethodDescriptor(
  '/com.mintter.Accounts/GenSeed',
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
const methodInfo_Accounts_GenSeed = new grpc.web.AbstractClientBase.MethodInfo(
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
proto.com.mintter.AccountsClient.prototype.genSeed =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/com.mintter.Accounts/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Accounts_GenSeed,
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
proto.com.mintter.AccountsPromiseClient.prototype.genSeed =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/com.mintter.Accounts/GenSeed',
      request,
      metadata || {},
      methodDescriptor_Accounts_GenSeed);
};


module.exports = proto.com.mintter;

