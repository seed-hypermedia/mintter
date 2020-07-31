import {Transforms} from 'slate'
export function reorderBlocks(editor, {source, destination}) {
  Transforms.moveNodes(editor, {
    at: [source.index],
    to: [destination.index],
  })
}
