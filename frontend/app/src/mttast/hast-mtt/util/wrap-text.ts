import {H} from '../types'

export function wrapText(h: H, value: string): string {
  return h.wrapText ? value : value.replace(/\r?\n|\r/g, ' ')
}
