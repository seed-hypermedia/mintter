import {Range} from 'slate'

export const isPointAtRoot = point => point.path.length === 2
export const isRangeAtRoot = (range: Range) =>
  isPointAtRoot(range.anchor) || isPointAtRoot(range.focus)
