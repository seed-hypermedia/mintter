import type { Range } from 'slate';

// TODO: fix types
export const isPointAtRoot = (point: any) => point.path.length === 2;
export const isRangeAtRoot = (range: Range) =>
  isPointAtRoot(range.anchor) || isPointAtRoot(range.focus);
