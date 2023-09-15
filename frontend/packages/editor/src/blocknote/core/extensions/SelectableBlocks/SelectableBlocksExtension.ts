import {Extension} from '@tiptap/core'
import {createSelectableBlocksPlugin} from './SelectableBlocksPlugin'

export const SelectableBlocksExtension = Extension.create({
  name: 'selectableBlocks',

  addProseMirrorPlugins() {
    return [createSelectableBlocksPlugin()]
  },
})
