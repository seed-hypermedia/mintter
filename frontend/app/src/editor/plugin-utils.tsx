import {createEditor, Editor, Range} from 'slate'
import type {NodeEntry} from 'slate'
import {withHistory} from 'slate-history'
import {withReact, DefaultElement, DefaultLeaf} from 'slate-react'
import type {RenderElementProps,RenderLeafProps} from 'slate-react'
import type {EditorEventHandlers, EditorPlugin} from './types'

const byMode = (mode:string) => (plugin:EditorPlugin) => plugin.mode === undefined || plugin.mode === mode

export function buildEditorHook(plugins: EditorPlugin[], mode: string): Editor {
  const hooks = plugins.filter(byMode(mode)).flatMap(({configureEditor}) => configureEditor || [])

  return hooks.reduce((editor, hook) => hook(editor) || editor, withHistory(withReact(createEditor())))
}

export function buildRenderElementHook(
  plugins: EditorPlugin[], mode: string
): ((props: RenderElementProps) => JSX.Element) | undefined {
  const hooks = plugins.filter(byMode(mode)).flatMap(({renderElement}) => renderElement || [])
  if (!hooks.length) return undefined

  return function SlateElement(props: RenderElementProps) {
    for (const renderElement of hooks) {
      const element = renderElement(props)
      if (element) return element
    }
    return <DefaultElement {...props} />
  }
}

export function buildRenderLeafHook(plugins: EditorPlugin[], mode: string): ((props: RenderLeafProps) => JSX.Element) | undefined {
  const hooks = plugins.filter(byMode(mode)).flatMap(({renderLeaf}) => renderLeaf || [])
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

export function buildDecorateHook(plugins: EditorPlugin[], mode:string): ((entry: NodeEntry) => Range[]) | undefined {
  const hooks = plugins.filter(byMode(mode)).flatMap(({decorate}) => decorate || [])
  if (!hooks.length) return undefined

  return (entry: NodeEntry) => hooks.flatMap((decorate) => decorate(entry) || [])
}

export function buildEventHandlerHook(
  plugins: EditorPlugin[],
  event: keyof EditorEventHandlers,
  mode: string
): ((props: unknown) => void) | undefined {
  const hooks = plugins.filter(byMode(mode)).flatMap((p) => p[event] || [])

  if (!hooks.length) return undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ev: any) => hooks.forEach((h) => h(ev))
}

export function getUsedEventHandlers(plugins: EditorPlugin[]): Array<keyof EditorEventHandlers> {
  return plugins.flatMap((p) => Object.keys(p).filter((k) => k.startsWith('on'))) as Array<keyof EditorEventHandlers>
}
