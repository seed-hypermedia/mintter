import type {grpc as grpct} from '@improbable-eng/grpc-web'
import pkg from '@improbable-eng/grpc-web'
import {BrowserHeaders} from 'browser-headers'
const {grpc} = pkg

/* eslint-disable */
export const MINTTER_API_URL_DEFAULT =
  (import.meta as any).env.VITE_MINTTER_API_URL || 'http://localhost:55001'

export interface GrpcClient {
  unary<T extends grpct.UnaryMethodDefinition<any, any>>(
    methodDesc: T,
    _request: any,
    _metadata?: grpct.Metadata,
  ): Promise<unknown>
}

interface createGrpcClientOptions {
  host?: string
  transport?: grpct.TransportFactory
  metadata?: grpct.Metadata
  debug?: boolean
}

export function createGrpcClient(
  options: createGrpcClientOptions = {},
): GrpcClient {
  return {
    unary(methodDesc, _request, _metadata) {
      const request = {..._request, ...methodDesc.requestType}
      const metadata = new BrowserHeaders({
        ...(options.metadata?.headersMap || {}),
        ...(_metadata?.headersMap || {}),
      })

      return new Promise((resolve, reject) => {
        grpc.unary(methodDesc, {
          request,
          host: options.host || MINTTER_API_URL_DEFAULT,
          metadata,
          transport: options.transport,
          debug: options.debug,
          onEnd(response) {
            if (response.status === grpc.Code.OK) {
              resolve(response.message)
            } else {
              const err = new Error(response.statusMessage) as any
              err.code = response.status
              err.metadata = response.trailers
              reject(err)
            }
          },
        })
      })
    },
  }
}
