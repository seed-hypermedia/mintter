import type {NodeEntry} from 'slate'
import {createEditor, Editor, Range} from 'slate'
import {withHistory} from 'slate-history'
import type {RenderElementProps, RenderLeafProps} from 'slate-react'
import {DefaultElement, DefaultLeaf, withReact} from 'slate-react'
import type {EditableProps} from 'slate-react/dist/components/editable'
import type {EditorEventHandlers, EditorPlugin} from './types'
export enum EditorMode {
  Draft,
  Publication,
  Embed,
  Mention,
}

/*
 * @todo Add Documentation to Editor plugin utils
 * @body While all these utils work well, are very functional and meet the purpose, it's really hard to follow because of the constant use of inline functions and "clever" solutions. This is specially important to optimize the code not only for the machine but for other developers.
 *
 * I don't expect to refactor and do a complete rewrite, but at least create code comments that help other developers follow along and understand what is happening and why is this way.
 *
 * It would be nice also to think of ways to test this code.
 */

const byApply =
  (mode: EditorMode) =>
  (plugin: EditorPlugin): boolean => {
    if (typeof plugin.apply === 'function') {
      return plugin.apply(mode)
    } else {
      return plugin.apply === undefined || plugin.apply === mode
    }
  }

class PluginError extends Error {
  constructor(plugin: string, message: string) {
    super(message)
    this.name = `[${plugin}] Error`
  }
}

const hasHook = (hook: keyof EditorPlugin) => (
  plugin: EditorPlugin,
): plugin is EditorPlugin & Required<Pick<EditorPlugin, typeof hook>> => {
  return typeof plugin[hook] === 'function'
}

const withMode = (mode: EditorMode) => (editor: Editor) => {
  editor.mode = mode
  return editor
}

export function buildEditorHook(plugins: EditorPlugin[], mode: EditorMode): Editor {
  const filteredPlugins = plugins.filter(byApply(mode)).filter(hasHook('configureEditor'))

  let editor = withMode(mode)(withHistory(withReact(createEditor())))
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

export function buildRenderElementHook(plugins: EditorPlugin[], editor: Editor): EditableProps['renderElement'] {
  const filteredPlugins = plugins.filter(byApply(editor.mode)).filter(hasHook('renderElement'))
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

export function buildRenderLeafHook(plugins: EditorPlugin[], editor: Editor): EditableProps['renderLeaf'] {
  const filteredPlugins = plugins.filter(byApply(editor.mode)).filter(hasHook('renderLeaf'))
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

export function buildDecorateHook(plugins: EditorPlugin[], editor: Editor): EditableProps['decorate'] {
  const filteredPlugins = plugins.filter(byApply(editor.mode)).filter(hasHook('decorate'))
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

export function buildEventHandlerHooks(plugins: EditorPlugin[], editor: Editor): EditableEventHandlers {
  const handlers: EditableEventHandlers = {}
  const filteredPlugins = plugins.filter(byApply(editor.mode))
  const events = filteredPlugins.flatMap((p) => Object.keys(p).filter((k) => k.startsWith('on'))) as Array<
    keyof EditableEventHandlers
  >

  for (const event of events) {
    const filteredPlugins = plugins.filter(byApply(mode)).filter(hasHook(event))

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
