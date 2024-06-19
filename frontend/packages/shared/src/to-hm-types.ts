import {
  Account,
  ChangeInfo,
  Document,
  HMAccount,
  HMChangeInfo,
  HMDeletedEntity,
  HMDocument,
  HMLink,
  HMPublication,
  MttLink,
  Publication,
} from '@shm/shared'
import {DeletedEntity} from './client/.generated/entities/v1alpha/entities_pb'

export function hmPublication(
  input?: Publication | null,
): HMPublication | null {
  if (!input) return null
  return input.toJson() as HMPublication
}

export function hmDocument(input?: Document | null): HMDocument | null {
  if (!input) return null
  // @ts-expect-error
  if (typeof input.toJson != 'function') return input
  return input.toJson() as HMDocument
}

export function hmAccount(input?: Account | null): HMAccount | null {
  if (!input) return null
  if (typeof input.toJson != 'function') return input
  return input.toJson() as HMAccount
}

export function hmChangeInfo(input?: ChangeInfo | null): HMChangeInfo | null {
  if (!input) return null
  // @ts-expect-error
  if (typeof input.toJson != 'function') return input
  return input.toJson() as HMChangeInfo
}

export function hmLink(input?: MttLink): HMLink | null {
  if (!input) return null

  if (typeof input.toJson != 'function') return input
  return input.toJson() as HMLink
}

export function hmDeletedEntity(input: DeletedEntity): HMDeletedEntity | null {
  if (!input) return null
  // @ts-expect-error
  if (typeof input.toJson != 'function') return input
  return input.toJson() as HMDeletedEntity
}
