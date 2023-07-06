if (!global.setImmediate || !globalThis['setImmediate']) {
  //@ts-ignore
  global.setImmediate = setTimeout
  //@ts-ignore
  globalThis['setImmediate'] = setTimeout
}

import {
  createGrpcWebTransport,
  createPromiseClient,
  Interceptor,
} from '@bufbuild/connect-web'
import {
  Accounts,
  Publications,
  WebSite,
  Daemon,
  Networking,
} from '@mintter/shared'

const loggingInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    // @ts-ignore
    console.log(`🔃 to ${req.method.name} `, req.message, result?.message)
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
  const result = await next({...req, init: {...req.init, redirect: 'follow'}})
  return result
}

function getGRPCHost() {
  if (process.env.NEXT_PUBLIC_GRPC_HOST) {
    return process.env.NEXT_PUBLIC_GRPC_HOST
  }

  if (process.env.NODE_ENV == 'development') {
    return 'http://127.0.0.1:56001'
  }

  return 'https://gateway.mintter.com'
}

const IS_DEV = process.env.NODE_ENV == 'development'
const IS_CLIENT = !!global.window
// const DEV_INTERCEPTORS = IS_CLIENT ? [loggingInterceptor] : []
const DEV_INTERCEPTORS = [loggingInterceptor, prodInter]

let grpcBaseURL = getGRPCHost()

console.log('⚙️ Client Config ', {
  grpcBaseURL,
  NEXT_PUBLIC_LN_HOST: process.env.NEXT_PUBLIC_LN_HOST,
  NEXT_PUBLIC_GRPC_HOST: process.env.NEXT_PUBLIC_GRPC_HOST,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
  IS_DEV,
  IS_CLIENT,
})

export const transport = createGrpcWebTransport({
  baseUrl: grpcBaseURL,
  // @ts-ignore
  interceptors: IS_DEV ? DEV_INTERCEPTORS : [prodInter],
})

function augmentWebsiteClient(
  client: ReturnType<typeof createPromiseClient<typeof WebSite>>,
) {
  return {
    ...client,
    getPath: async (req: {path: string}) => {
      const result = await client.getPath(req).catch((error) => {
        if (error.rawMessage?.match('Could not get record for path')) {
          return null
        }
        if (
          error.rawMessage?.match(
            'Could not get local document although was found',
          )
        ) {
          return null
        }
        throw error
      })
      return result
    },
  }
}

export const publicationsClient = createPromiseClient(Publications, transport)
export const localWebsiteClient = augmentWebsiteClient(
  createPromiseClient(WebSite, transport),
)
export const accountsClient = createPromiseClient(Accounts, transport)
export const daemonClient = createPromiseClient(Daemon, transport)
export const networkingClient = createPromiseClient(Networking, transport)
