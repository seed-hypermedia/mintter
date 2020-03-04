import {Editor, Node, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
// force layout with nested elements

/*

Document Header

- block type "document-header"
- it needs to have 2 childrens only: one with type "title" & another one with type "description"
*/

// export interface WithForcedLayout {}

const withForcedLayout = <T extends Editor>(
  editor: T,
): Editor & ReactEditor => {
  const e = editor as T & ReactEditor
  const {normalizeNode} = e

  e.normalizeNode = ([node, path]) => {
    if (path.length === 0) {
      // I'm in the editor node (node === editor)
      for (const [child, childPath] of Node.children(editor, path)) {
        // make sure the first child of the editor has the type "document-header", if not, set it to it.
        if (childPath[0] === 0) {
          if (child.type !== 'document-header') {
            Transforms.setNodes(editor, {type: 'document-header'})
          }

          // iterate over the "document-header" children
          for (const [children, childrenPath] of Node.children(child, path)) {
            // set the correct type for the children of "document-header"
            // First child should be type "title"
            // Second child should be type "description"
            const type =
              childrenPath[0] === 0
                ? 'title'
                : childrenPath[0] === 1
                ? 'description'
                : 'paragraph'

            if (children.type !== type) {
              Transforms.setNodes(editor, {type})
            }

            // "document-header" can only have 2 children (title & description)
            // any other chldren should be sibling of "document-header"
            if (childrenPath[0] === 2) {
              Transforms.liftNodes(editor, {at: [0, childrenPath[0]]})
            }
          }
        }
      }

      return
    }

    normalizeNode([node, path])
  }

  return e
}

export default withForcedLayout
