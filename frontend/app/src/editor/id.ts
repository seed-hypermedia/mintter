import { nanoid } from 'nanoid';

export function id(size = 8): string {
  return nanoid(size);
}
