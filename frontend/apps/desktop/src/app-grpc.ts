import type {Interceptor} from '@connectrpc/connect'
import {createGrpcWebTransport} from '@connectrpc/connect-node'
import {API_HTTP_URL, createGRPCClient} from '@shm/shared'

const loggingInterceptor: Interceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    // @ts-ignore
    // console.log(`🔃 to ${req.method.name} `, req.message, result?.message)
    return result
  } catch (e: any) {
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

const IS_DEV = process.env.NODE_ENV == 'development'
const DEV_INTERCEPTORS = [loggingInterceptor, prodInter]

export const transport = createGrpcWebTransport({
  baseUrl: API_HTTP_URL,
  httpVersion: '1.1',
  interceptors: IS_DEV ? DEV_INTERCEPTORS : [prodInter],
})

export const grpcClient = createGRPCClient(transport)
