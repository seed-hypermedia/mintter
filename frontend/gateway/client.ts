import {createGrpcWebTransport, Interceptor} from '@bufbuild/connect-web'

const loggingInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    // @ts-ignore
    console.log(`🔃 to ${req.method.name} `, req.message, result.message)
    return result
  } catch (e) {
    console.error(`🚨 to ${req.method.name} `, e)
    throw e
  }
}

let host =
  process.env.GW_GRPC_ENDPOINT || process.env.VERCEL_ENV == 'development'
    ? 'http://127.0.0.1:56001'
    : 'https://gateway.mintter.com'

function getHost() {
  if (process.env.GW_GRPC_ENDPOINT) {
    return process.env.GW_GRPC_ENDPOINT
  } else if (process.env.VERCEL_ENV == 'development') {
    return 'http://localhost:56001'
  }
  return 'https://gateway.mintter.com'
}

const prodInter: Interceptor = (next) => async (req) => {
  const result = await next({...req, init: {...req.init, redirect: 'follow'}})
  return result
}

const IS_DEV = !!import.meta.env?.DEV
const IS_CLIENT = !!global.window
const DEV_INTERCEPTORS = IS_CLIENT ? [loggingInterceptor] : []

export const transport = createGrpcWebTransport({
  baseUrl: host,
  // @ts-ignore
  interceptors: IS_DEV ? DEV_INTERCEPTORS : [prodInter],
})
