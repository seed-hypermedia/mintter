import {EditorPlugin} from '@app/editor/types'
import {isFlowContent, isGroupContent} from '@mintter/shared'
import {Editor, Node, Operation, Path} from 'slate'

export function withDirtyPaths(editor: Editor): Editor {
  const {getDirtyPaths} = editor

  editor.getDirtyPaths = (op: Operation) => {
    let originalPaths = getDirtyPaths(op)
    switch (op.type) {
      case 'insert_text':
      case 'remove_text':
        let blockentry = editor.above({
          at: op.path,
          match: isFlowContent,
          mode: 'lowest',
        })

        if (blockentry) {
          let [, blockPath] = blockentry

          let realPaths = originalPaths.filter((p) =>
            Path.isDescendant(p, blockPath),
          )

          return [blockPath, ...realPaths]
        }

        return originalPaths
      case 'move_node':
        let movedNode = Node.get(editor, op.path)
        if (isGroupContent(movedNode)) {
          let result: Array<Path> = []
          // get above paths untile the next block parent for both path and newPath
          if (op.path.length <= 2) return originalPaths

          let pathParent = Path.parent(op.path)

          let paths = originalPaths.filter((p) =>
            Path.isDescendant(p, pathParent),
          )

          result.concat([pathParent, ...paths])

          let newPathParent = Path.parent(op.newPath)

          let newPaths = originalPaths.filter((p) =>
            Path.isDescendant(p, newPathParent),
          )

          result.concat([newPathParent, ...newPaths])

          if (result.length) return result
        }
        return originalPaths
      case 'remove_node':
      case 'merge_node':
      case 'insert_node':
        const parentPath = Path.parent(op.path)
        let realPaths = originalPaths.filter((p) =>
          Path.isDescendant(p, parentPath),
        )

        return [parentPath, ...realPaths]
      default:
        return originalPaths
    }
  }

  return editor
}
