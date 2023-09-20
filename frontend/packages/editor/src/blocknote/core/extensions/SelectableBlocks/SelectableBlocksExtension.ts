import {Extension} from '@tiptap/core'
import {Node} from 'prosemirror-model'
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

const PLUGIN_KEY = new PluginKey('SelectableBlocksPlugin')

export const SelectableBlocksExtension = Extension.create({
  name: 'selectableBlocks',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          handleClickOn: (
            view: EditorView,
            _,
            node: Node,
            nodePos: number,
            event: MouseEvent,
          ) => {
            if (!view.editable) return false
            if (
              (node.type.name === 'image' &&
                // @ts-ignore
                event.target?.nodeName === 'IMG') ||
              ['file', 'embed', 'video'].includes(node.type.name)
            ) {
              let tr = view.state.tr
              const selection = NodeSelection.create(view.state.doc, nodePos)
              tr = tr.setSelection(selection)
              view.dispatch(tr)
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})
