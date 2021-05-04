import type { Range } from 'slate';
import { isPointAtRoot } from './is-point-at-root';

export const isRangeAtRoot = (range: Range) =>
  isPointAtRoot(range.anchor) || isPointAtRoot(range.focus);
