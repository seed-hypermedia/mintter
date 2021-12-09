import type {NodeEntry} from 'slate'
import {createEditor, Editor, Range} from 'slate'
import {withHistory} from 'slate-history'
import type {RenderElementProps, RenderLeafProps} from 'slate-react'
import {DefaultElement, DefaultLeaf, withReact} from 'slate-react'
import type {EditableProps} from 'slate-react/dist/components/editable'
import {error} from 'tauri-plugin-log-api'
import type {EditableEventHandlers, EditorPlugin} from './types'

export enum EditorMode {
  Draft,
  Publication,
  Embed,
  Mention,
}

const byApply =
  (mode: EditorMode) =>
  (plugin: EditorPlugin): boolean => {
    if (typeof plugin.apply == 'function') {
      return plugin.apply(mode)
    } else {
      return plugin.apply === undefined || plugin.apply === mode
    }
  }

const hasHook =
  (hook: keyof EditorPlugin) =>
  (plugin: EditorPlugin): plugin is EditorPlugin & Required<Pick<EditorPlugin, typeof hook>> => {
    return typeof plugin[hook] === 'function'
  }

const withMode = (mode: EditorMode) => (editor: Editor) => {
  editor.mode = mode
  editor.readOnly = mode >= EditorMode.Publication
  return editor
}

export function buildEditorHook(plugins: EditorPlugin[], mode: EditorMode): Editor {
  const filteredPlugins = plugins.filter(byApply(mode)).filter(hasHook('configureEditor'))

  let editor = withMode(mode)(withHistory(withReact(createEditor())))
  for (const {name, configureEditor} of filteredPlugins) {
    try {
      editor = configureEditor(editor) || editor
    } catch (e) {
      console.log('import.meta.env', import.meta.env.MODE)
      if (!import.meta.env.SSR) {
        error(`[${name}] ${e} in configureEditor hook`)
      }
      throw e
    }
  }
  return editor
}

export function buildRenderElementHook(plugins: EditorPlugin[], editor: Editor): EditableProps['renderElement'] {
  const filteredPlugins = plugins.filter(byApply(editor.mode)).filter(hasHook('renderElement'))
  if (!filteredPlugins.length) return undefined

  return function SlateElement(props: RenderElementProps) {
    for (const {name, renderElement} of filteredPlugins) {
      try {
        const element = renderElement(editor)(props)
        if (element) return element
      } catch (e) {
        error(`[${name}] ${e} in renderElement hook`)
        throw error
      }
    }
    return <DefaultElement {...props} />
  }
}

export function buildRenderLeafHook(plugins: EditorPlugin[], editor: Editor): EditableProps['renderLeaf'] {
  const filteredPlugins = plugins.filter(byApply(editor.mode)).filter(hasHook('renderLeaf'))
  if (!filteredPlugins.length) return undefined

  return function SlateLeaf(props: RenderLeafProps) {
    const leafProps = {...props}

    for (const {name, renderLeaf} of filteredPlugins) {
      try {
        const newChildren = renderLeaf(editor)(leafProps)
        if (newChildren) leafProps.children = newChildren
      } catch (e) {
        error(`[${name}] ${e} in renderLeaf hook`)
        throw error
      }
    }

    return <DefaultLeaf {...leafProps} />
  }
}

export function buildDecorateHook(plugins: EditorPlugin[], editor: Editor): EditableProps['decorate'] {
  const filteredPlugins = plugins.filter(byApply(editor.mode)).filter(hasHook('decorate'))
  if (!filteredPlugins.length) return undefined

  return function decorate(entry: NodeEntry) {
    let ranges: Range[] = []

    for (const {name, decorate} of filteredPlugins) {
      try {
        ranges = ranges.concat(decorate(editor)(entry) || [])
      } catch (e) {
        error(`[${name}] ${e} in decorate hook`)
        throw error
      }
    }
    return ranges
  }
}

export function buildEventHandlerHooks(plugins: EditorPlugin[], editor: Editor): EditableEventHandlers {
  const handlers: EditableEventHandlers = {}
  const filteredPlugins = plugins.filter(byApply(editor.mode))
  const events = filteredPlugins.flatMap((p) => Object.keys(p).filter((k) => k.startsWith('on'))) as Array<
    keyof EditableEventHandlers
  >

  for (const event of events) {
    const pluginsWithHook = filteredPlugins.filter(hasHook(event))

    handlers[event] = function (ev) {
      for (const {name, [event]: hook} of pluginsWithHook) {
        try {
          // @ts-expect-error ev has incompatible types
          hook(editor)(ev)
        } catch (e) {
          error(`[${name}] ${e} in ${event} hook`)
          throw error
        }
      }
    }
  }
  return handlers
}
