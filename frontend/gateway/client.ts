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
  process.env.GW_GRPC_ENDPOINT || process.env.VERCEL
    ? 'https://gateway.mintter.com'
    : 'http://127.0.0.1:56001'
    
    console.log(
      '🚀 ~ file: client.ts:16 ~ host:',
      process.env.GW_GRPC_ENDPOINT,
      host,
    )

const prodInter: Interceptor = (next) => async (req) => {
  const result = await next({...req, init: {...req.init, redirect: 'follow'}})
  return result
}

const IS_DEV = !!import.meta.env?.DEV
const IS_CLIENT = !!global.window
const DEV_INTERCEPTORS = IS_CLIENT ? [loggingInterceptor] : []

let baseUrl = process.env.VERCEL ? 'https://gateway.mintter.com' : host
console.log('🚀 ~ file: client.ts:41 ~ baseUrl:', baseUrl)

export const transport = createGrpcWebTransport({
  baseUrl: 'https://gateway.mintter.com',
  // @ts-ignore
  interceptors: IS_DEV ? DEV_INTERCEPTORS : [prodInter],
})
