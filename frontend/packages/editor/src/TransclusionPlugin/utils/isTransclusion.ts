import {SlateBlock} from '../../editor'

export function isTransclusion({id}: SlateBlock): boolean {
  // TODO: make sure this check is sufficient
  return id.includes('/')
}
