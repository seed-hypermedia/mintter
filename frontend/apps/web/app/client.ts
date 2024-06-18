import {createGrpcWebTransport} from "@connectrpc/connect-node";
import {createGRPCClient} from "@shm/shared/src/grpc-client";

const IS_PROD = process.env.NODE_ENV == "production";

function getGRPCHost() {
  if (process.env.GRPC_HOST) {
    return process.env.GRPC_HOST;
  }

  if (IS_PROD) {
    return "https://hyper.media";
  }

  return "http://127.0.0.1:56001";
}

export const transport = createGrpcWebTransport({
  baseUrl: getGRPCHost(),
  httpVersion: "1.1",
  // interceptors: IS_DEV ? DEV_INTERCEPTORS : [prodInter],
});

export const queryClient = createGRPCClient(transport);
