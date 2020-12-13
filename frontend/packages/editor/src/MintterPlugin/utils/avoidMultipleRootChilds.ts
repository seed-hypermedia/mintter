import {Transforms} from 'slate'

export function avoidMultipleRootChilds(editor) {
  if (editor.children.length > 1) {
    Transforms.moveNodes(editor, {at: [0], to: [1, 0]})

    return true
  }

  return
}
