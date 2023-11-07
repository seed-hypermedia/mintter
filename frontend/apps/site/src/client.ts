if (!global.setImmediate || !globalThis['setImmediate']) {
  //@ts-ignore
  global.setImmediate = setTimeout
  //@ts-ignore
  globalThis['setImmediate'] = setTimeout
}
import type {Interceptor} from '@connectrpc/connect'
import {createGrpcWebTransport} from '@connectrpc/connect-node'
import {createGRPCClient} from '@mintter/shared'

const loggingInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    // @ts-ignore
    // console.log(`🔃 to ${req.method.name} `, req.message, result?.message)
    return result
  } catch (e) {
    let error = e
    if (e.message.match('stream.getReader is not a function')) {
      error = new Error('RPC broken, try running yarn and ./dev gen')
    }
    console.error(`🚨 to ${req.method.name} `, req.message, error)
    throw error
  }
}

const prodInter: Interceptor = (next) => async (req) => {
  const result = await next({
    ...req,
    init: {...req.init, redirect: 'follow'},
  }).catch((e) => {
    if (e.message.match('fetch failed') && e.stack.join('.').match('undici')) {
      console.error(
        // 'Mysterious Undici Error via ConnectWeb. Quitting the server so that the environment restarts it',
        'Mysterious Undici Error',
      )
      console.error(e)
      // process.exit(1)
    }
    throw e
  })
  return result
}

function getGRPCHost() {
  if (process.env.GRPC_HOST) {
    return process.env.GRPC_HOST
  }

  if (process.env.NODE_ENV == 'development') {
    return 'http://127.0.0.1:56001'
  }

  return 'https://hyper.media'
}

const IS_DEV = process.env.NODE_ENV == 'development'
const IS_CLIENT = !!global.window
// const DEV_INTERCEPTORS = IS_CLIENT ? [loggingInterceptor] : []
const DEV_INTERCEPTORS = [loggingInterceptor, prodInter]

let grpcBaseURL = getGRPCHost()

console.log('⚙️ Client Config ', {
  grpcBaseURL,
  NEXT_PUBLIC_LN_HOST: process.env.NEXT_PUBLIC_LN_HOST,
  GRPC_HOST: process.env.GRPC_HOST,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
  IS_DEV,
  IS_CLIENT,
})

export const transport = createGrpcWebTransport({
  baseUrl: grpcBaseURL,
  httpVersion: '1.1',
  interceptors: IS_DEV ? DEV_INTERCEPTORS : [prodInter],
})

export const queryClient = createGRPCClient(transport)
