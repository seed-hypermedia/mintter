import {nanoid} from 'nanoid'

export function id(size: number = 8): string {
  return nanoid(size)
}
