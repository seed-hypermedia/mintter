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

const prodInter: Interceptor = (next) => async (req) => {
  const result = await next({...req, init: {...req.init, redirect: 'follow'}})
  return result
}

// @ts-ignore
// console.log(import.meta.env?.DEV ? '🦾 Development mode' : '🚀 Production mode')

export const transport = createGrpcWebTransport({
  baseUrl: 'http://localhost:55001',
  // baseUrl: 'https://gateway.mintter.com',
  // @ts-ignore
  interceptors: import.meta.env?.DEV ? [loggingInterceptor] : [prodInter],
})
