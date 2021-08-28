import {createEditor, Editor, Range} from 'slate'
import type {NodeEntry} from 'slate'
import {withHistory} from 'slate-history'
import {withReact, DefaultElement, DefaultLeaf} from 'slate-react'
import type {RenderElementProps, RenderLeafProps} from 'slate-react'
import type {EditorEventHandlers, EditorPlugin} from './types'
import type {EditableProps} from 'slate-react/dist/components/editable'

const byMode = (mode: string) => (plugin: EditorPlugin) => plugin.mode === undefined || plugin.mode === mode

class PluginError extends Error {
  constructor(plugin: string, message: string) {
    super(message)
    this.name = `[${plugin}] Error`
  }
}

const hasHook =
  (hook: keyof EditorPlugin) =>
  (plugin: EditorPlugin): plugin is EditorPlugin & Required<Pick<EditorPlugin, typeof hook>> => {
    return typeof plugin[hook] === 'function'
  }

export function buildEditorHook(plugins: EditorPlugin[], mode: string): Editor {
  const filteredPlugins = plugins.filter(byMode(mode)).filter(hasHook('configureEditor'))

  let editor = withHistory(withReact(createEditor()))
  for (const {name, configureEditor} of filteredPlugins) {
    try {
      editor = configureEditor(editor) || editor
    } catch (e) {
      const error = new PluginError(name, 'in configureEditor hook')
      error.stack = e.stack
      throw error
    }
  }
  return editor
}

export function buildRenderElementHook(plugins: EditorPlugin[], mode: string): EditableProps['renderElement'] {
  const filteredPlugins = plugins.filter(byMode(mode)).filter(hasHook('renderElement'))
  if (!filteredPlugins.length) return undefined

  return function SlateElement(props: RenderElementProps) {
    for (const {name, renderElement} of filteredPlugins) {
      try {
        const element = renderElement(props)
        if (element) return element
      } catch (e) {
        const error = new PluginError(name, 'in renderElement hook')
        error.stack = e.stack
        throw error
      }
    }
    return <DefaultElement {...props} />
  }
}

export function buildRenderLeafHook(plugins: EditorPlugin[], mode: string): EditableProps['renderLeaf'] {
  const filteredPlugins = plugins.filter(byMode(mode)).filter(hasHook('renderLeaf'))
  if (!filteredPlugins.length) return undefined

  return function SlateLeaf(props: RenderLeafProps) {
    const leafProps = {...props}

    for (const {name, renderLeaf} of filteredPlugins) {
      try {
        const newChildren = renderLeaf(leafProps)
        if (newChildren) leafProps.children = newChildren
      } catch (e) {
        const error = new PluginError(name, 'in renderLeaf hook')
        error.stack = e.stack
        throw error
      }
    }

    return <DefaultLeaf {...leafProps} />
  }
}

export function buildDecorateHook(plugins: EditorPlugin[], mode: string): EditableProps['decorate'] {
  const filteredPlugins = plugins.filter(byMode(mode)).filter(hasHook('decorate'))
  if (!filteredPlugins.length) return undefined

  return function decorate(entry: NodeEntry) {
    let ranges: Range[] = []

    for (const {name, decorate} of filteredPlugins) {
      try {
        ranges = ranges.concat(decorate(entry) || [])
      } catch (e) {
        const error = new PluginError(name, 'in decorate hook')
        error.stack = e.stack
        throw error
      }
    }
    return ranges
  }
}

export function buildEventHandlerHooks(plugins: EditorPlugin[], mode: string): EditorEventHandlers {
  const handlers: EditorEventHandlers = {}
  const events = plugins.filter(byMode(mode)).flatMap((p) => Object.keys(p).filter((k) => k.startsWith('on'))) as Array<
    keyof EditorEventHandlers
  >

  for (const event of events) {
    const filteredPlugins = plugins.filter(byMode(mode)).filter(hasHook(event))

    handlers[event] = function (ev) {
      for (const {name, [event]: hook} of filteredPlugins) {
        try {
          // @ts-expect-error the event handler expects `this` to be type never which we cannot pass
          hook(ev)
        } catch (e) {
          const error = new PluginError(name, `in ${event} hook`)
          error.stack = e.stack
          throw error
        }
      }
    }
  }
  return handlers
}
