import type {
  Content,
  EmbeddedContent,
  FlowContent,
  GroupingContent,
  PhrasingContent,
  StaticContent,
  StaticPhrasingContent,
} from 'frontend/client/src/mttast'
import {BaseRange, Range} from 'mixtape'
import {u} from 'unist-builder'
import {nanoid} from 'nanoid'
import {isPlainObject} from 'is-plain-object'

export function isCollapsed(range: unknown): range is Range {
  return Range.isCollapsed(range as BaseRange)
}

const includesNodeType =
  <T extends unknown>(types: string[]) =>
  (value: unknown): value is T => {
    return isPlainObject(value) && types.includes((value as Record<string, string>).type)
  }

export const isFlowContent = includesNodeType<FlowContent>(['blockquote', 'header', 'statement'])

export const isGroupContent = includesNodeType<GroupingContent>(['group', 'orderedList', 'unorderedList'])

export const isEmbeddedContent = includesNodeType<EmbeddedContent>(['embed', 'video', 'image'])

export const isStaticPhrasingContent = includesNodeType<StaticPhrasingContent>(['text'])

export const isPhrasingContent = includesNodeType<PhrasingContent>(['text', 'link'])

export const isContent = includesNodeType<Content>(['paragraph'])

export const isStaticContent = includesNodeType<StaticContent>(['staticParagraph'])

export function createStatement() {
  return u('statement', {id: nanoid()}, [u('paragraph', [u('text', '')])])
}
