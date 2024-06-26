import {toPlainMessage} from '@bufbuild/protobuf'
import {
  Account,
  ChangeInfo,
  Document,
  HMAccount,
  HMChangeInfo,
  HMDeletedEntity,
  HMDocument,
  HMLink,
  Link,
} from '@shm/shared'
import {DeletedEntity} from './client/.generated/entities/v1alpha/entities_pb'

export function hmDocument(input?: Document | null): HMDocument | null {
  if (!input) return null
  return toPlainMessage(input)
}

export function hmAccount(input?: Account | null): HMAccount | null {
  if (!input) return null
  return toPlainMessage(input)
}

export function hmChangeInfo(input?: ChangeInfo | null): HMChangeInfo | null {
  if (!input) return null
  // @ts-ignore todo zod validation
  return toPlainMessage(input)
}

export function hmLink(input?: Link): HMLink | null {
  if (!input) return null
  return toPlainMessage(input)
}

export function hmDeletedEntity(input: DeletedEntity): HMDeletedEntity | null {
  if (!input) return null
  return toPlainMessage(input)
}
