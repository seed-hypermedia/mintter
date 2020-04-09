import {Editor, Transforms, Range} from 'slate'
import {ReactEditor} from 'slate-react'
import {SHORTCUTS, shortcutTypes} from './types'

export default function withShortcuts<T extends Editor>(
  editor: T,
): Editor & ReactEditor {
  const e = editor as T & ReactEditor
  const {insertText} = e

  e.insertText = text => {
    const {selection} = editor

    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const {anchor} = selection

      const block = Editor.above(e, {
        match: n => Editor.isBlock(e, n),
      })

      const path = block ? block[1] : []
      const start = Editor.start(e, path)

      const range = {anchor, focus: start}
      const beforeText = Editor.string(e, range)

      const type = SHORTCUTS[beforeText]

      if (type) {
        Transforms.select(e, range)
        Transforms.delete(e)
        Transforms.setNodes(e, {type}, {match: n => Editor.isBlock(e, n)})

        if (type === shortcutTypes.LIST_ITEM) {
          // TODO: fix types
          const list: any = {type: null, children: []}
          switch (beforeText) {
            case '1.':
              list.type = shortcutTypes.NUMBERED_LIST
              break
            default:
              list.type = shortcutTypes.BULLETED_LIST
          }

          Transforms.wrapNodes(editor, list, {
            match: n => n.type === shortcutTypes.LIST_ITEM,
          })
        }

        return
      }
    }

    insertText(text)
  }

  // e.deleteBackward = (...args) => {
  //   const { selection } = editor;

  //   if (selection && Range.isCollapsed(selection)) {
  //     const match = Editor.above(editor, {
  //       match: n => Editor.isBlock(editor, n),
  //     });

  //     if (match) {
  //       const [block, path] = match;
  //       const start = Editor.start(editor, path);

  //       if (
  //         block.type !== 'paragraph' &&
  //         Point.equals(selection.anchor, start)
  //       ) {
  //         Transforms.setNodes(editor, { type: 'paragraph' });

  //         if (block.type === 'list-item') {
  //           Transforms.unwrapNodes(editor, {
  //             match: n => n.type === 'bulleted-list',
  //           });
  //         }

  //         return;
  //       }
  //     }

  //     deleteBackward(...args);
  //   }
  // };

  return e
}
