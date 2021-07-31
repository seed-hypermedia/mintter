import type {Statement} from '@mintter/mttast'
import {statement, paragraph, text, createId} from '@mintter/mttast-builder'
import {nanoid} from 'nanoid'
import {BaseRange, Point, Range} from 'slate'

export function createStatement(): Statement {
  return statement({id: createId()}, [paragraph([text('')])])
}

export function isCollapsed(range: unknown): range is Range {
  return Range.isCollapsed(range as BaseRange)
}
