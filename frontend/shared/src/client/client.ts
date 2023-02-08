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

// @ts-ignore
console.log(import.meta.env?.DEV ? '🦾 Development mode' : '🚀 Production mode')

export const transport = createGrpcWebTransport({
  baseUrl: 'http://localhost:55001',
  // @ts-ignore
  interceptors: import.meta.env?.DEV ? [loggingInterceptor] : [],
})
