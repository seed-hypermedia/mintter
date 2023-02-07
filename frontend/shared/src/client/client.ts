import {createGrpcWebTransport, Interceptor} from '@bufbuild/connect-web'

const loggingInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    console.log(`🔃 to ${req.method.name} `, req.message, result.message)
    return result
  } catch (e) {
    console.error(`🚨 to ${req.method.name} `, e)
    throw e
  }
}

console.log(import.meta.env?.DEV ? '🦾 Development mode' : '🚀 Production mode')

export const transport = createGrpcWebTransport({
  baseUrl: 'http://localhost:55001',
  interceptors: import.meta.env?.DEV ? [loggingInterceptor] : [],
})
