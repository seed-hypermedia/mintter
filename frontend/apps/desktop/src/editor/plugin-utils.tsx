import {error} from '@app/utils/logger'
import {ObjectKeys} from '@app/utils/object-keys'
import {createEditor, Editor, NodeEntry, Range} from 'slate'
import {withHistory} from 'slate-history'
import {
  DefaultElement,
  DefaultLeaf,
  RenderElementProps,
  RenderLeafProps,
  withReact,
} from 'slate-react'
import {EditableProps} from 'slate-react/dist/components/editable'
import {EditableEventHandlers, EditorPlugin} from './types'

export enum EditorMode {
  Embed = 'mode-embed',
  Mention = 'mode-mention',
  Discussion = 'mode-discussion',
  Publication = 'mode-publication',
  Draft = 'mode-draft',
}

const byApply =
  (mode: EditorMode) =>
  (plugin: EditorPlugin): boolean => {
    if (typeof plugin.apply == 'function') {
      return plugin.apply(mode)
    } else {
      return plugin.apply == undefined || plugin.apply == mode
    }
  }

const hasHook =
  (hook: keyof EditorPlugin) =>
  (
    plugin: EditorPlugin,
  ): plugin is EditorPlugin & Required<Pick<EditorPlugin, typeof hook>> => {
    return typeof plugin[hook] == 'function'
  }

export const withMode = (mode: EditorMode) => (editor: Editor) => {
  editor.mode = mode
  editor.readOnly = mode != EditorMode.Draft
  return editor
}

export function buildEditorHook(
  plugins: EditorPlugin[],
  mode: EditorMode,
): Editor {
  const filteredPlugins = plugins
    .filter(byApply(mode))
    .filter(hasHook('configureEditor'))

  let editor = withMode(mode)(withHistory(withReact(createEditor())))
  for (const {name, configureEditor} of filteredPlugins) {
    try {
      editor = configureEditor(editor) || editor
    } catch (e) {
      if (!import.meta.env.SSR) {
        error(`[${name}] ${e} in configureEditor hook`)
      }
      throw e
    }
  }
  return editor
}


export function buildDecorateHook(
  plugins: EditorPlugin[],
  editor: Editor,
): EditableProps['decorate'] {
  const filteredPlugins = plugins
    .filter(byApply(editor.mode))
    .filter(hasHook('decorate'))
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

export function buildEventHandlerHooks(
  plugins: EditorPlugin[],
  editor: Editor,
): EditableEventHandlers {
  const handlers: EditableEventHandlers = {}
  const filteredPlugins = plugins.filter(byApply(editor.mode))
  const events = filteredPlugins.flatMap((p) =>
    ObjectKeys(p).filter((k) => k.startsWith('on')),
  ) as Array<keyof EditableEventHandlers>

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