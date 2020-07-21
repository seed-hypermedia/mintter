import {ReactEditor} from 'slate-react'
// import {Range, Editor} from 'slate'
// import {nodeTypes} from '../nodeTypes'

export function withImageBlock() {
  return <T extends ReactEditor>(editor: T) => {
    // const {deleteBackward} = editor

    // editor.deleteBackward = p => {
    //   console.log('deleteBackward => ', editor.selection)
    //   const {selection} = editor
    //   if (selection && Range.isCollapsed(selection)) {
    //     const previous = Editor.above(editor, {
    //       match: n => n.type === nodeTypes.typeImg,
    //     })
    //     console.log('editor.deleteBackward -> previous', previous)
    //   }
    //   console.log('ppp ', p)

    //   deleteBackward(p)
    // }
    return editor
  }
}
