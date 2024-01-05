import {PartialMessage} from '@bufbuild/protobuf'
import {
  Publication as APIPublication,
  Document,
} from './.generated/documents/v1alpha/documents_pb'
export * from './.generated/types'
export * from './client-utils'
export * from './from-hm-block'
export * from './grpc-types'
export * from './to-hm-block'

export type Publication = APIPublication & {
  document?: PartialMessage<Document>
}
