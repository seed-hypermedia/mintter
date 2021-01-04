import {Transforms} from 'slate'
export function reorderBlocks(editor, {source, destination}) {
  console.log('reorderBlocks -> {source, destination}', {source, destination})
  Transforms.moveNodes(editor, {
    at: [source.index],
    to: [destination.index],
  })
}
