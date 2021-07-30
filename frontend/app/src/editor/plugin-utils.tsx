import {createEditor, NodeEntry, Editor, Range} from 'slate'
import {withReact, RenderElementProps, RenderLeafProps, DefaultElement, DefaultLeaf} from 'slate-react'
import type {EditorEventHandlers, EditorPlugin} from './types'

export function buildEditorHook(plugins: EditorPlugin[]): Editor {
  const hooks = plugins.flatMap(({configureEditor}) => configureEditor || [])

  return hooks.reduce((editor, configure) => configure(editor) || editor, withReact(createEditor()))
}

export function buildRenderElementHook(
  plugins: EditorPlugin[],
): ((props: RenderElementProps) => JSX.Element) | undefined {
  const hooks = plugins.flatMap(({renderElement}) => renderElement || [])
  if (!hooks.length) return undefined

  return function SlateElement(props: RenderElementProps) {
    for (const renderElement of hooks) {
      const element = renderElement(props)
      if (element) return element
    }
    return <DefaultElement {...props} />
  }
}

export function buildRenderLeafHook(plugins: EditorPlugin[]): ((props: RenderLeafProps) => JSX.Element) | undefined {
  const hooks = plugins.flatMap(({renderLeaf}) => renderLeaf || [])
  if (!hooks.length) return undefined

  return function SlateLeaf(props: RenderLeafProps) {
    const leafProps = {...props}

    for (const renderLeaf of hooks) {
      const newChildren = renderLeaf && renderLeaf(leafProps)
      if (newChildren) leafProps.children = newChildren
    }

    return <DefaultLeaf {...leafProps} />
  }
}

export function buildDecorateHook(plugins: EditorPlugin[]): ((entry: NodeEntry) => Range[]) | undefined {
  const hooks = plugins.flatMap(({decorate}) => decorate || [])
  if (!hooks.length) return undefined

  return (entry: NodeEntry) => hooks.flatMap((decorate) => decorate(entry) || [])
}

export function buildEventHandlerHook(
  plugins: EditorPlugin[],
  event: keyof EditorEventHandlers,
): ((props: unknown) => void) | undefined {
  const hooks = plugins.flatMap((p) => p[event] || [])
  if (!hooks.length) return undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ev: any) => hooks.forEach((h) => h(ev))
}

export function getUsedEventHandlers(plugins: EditorPlugin[]): Array<keyof EditorEventHandlers> {
  return plugins.flatMap((p) => Object.keys(p).filter((k) => k.startsWith('on'))) as Array<keyof EditorEventHandlers>
}
