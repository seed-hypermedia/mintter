import { nanoid } from 'nanoid';

export function createId(size: number = 8): string {
  return nanoid(size);
}
