import {
  Account,
  ChangeInfo,
  Document,
  Group,
  HMAccount,
  HMChangeInfo,
  HMDeletedEntity,
  HMDocument,
  HMGroup,
  HMLink,
  HMPublication,
  MttLink,
  Publication,
} from '@mintter/shared'
import {DeletedEntity} from './client/.generated/entities/v1alpha/entities_pb'

export function hmPublication(
  input?: Publication | null,
): HMPublication | null {
  if (!input) return null
  return input.toJson() as HMPublication
}

export function hmDocument(input?: Document | null): HMDocument | null {
  if (!input) return null
  if (typeof input.toJson != 'function') return null
  return input.toJson() as HMDocument
}

export function hmAccount(input?: Account | null): HMAccount | null {
  if (!input) return null
  if (typeof input.toJson != 'function') return null
  return input.toJson() as HMAccount
}

export function hmGroup(input?: Group | null): HMGroup | null {
  if (!input) return null
  if (typeof input.toJson != 'function') return null
  return input.toJson() as HMGroup
}

export function hmChangeInfo(input?: ChangeInfo | null): HMChangeInfo | null {
  if (!input) return null
  if (typeof input.toJson != 'function') return null
  return input.toJson() as HMChangeInfo
}

export function hmLink(input?: MttLink): HMLink | null {
  if (!input) return null
  if (typeof input.toJson != 'function') return null
  return input.toJson() as HMLink
}

export function hmDeletedEntity(input: DeletedEntity): HMDeletedEntity | null {
  if (!input) return null
  if (typeof input.toJson != 'function') return null
  return input.toJson() as HMDeletedEntity
}
