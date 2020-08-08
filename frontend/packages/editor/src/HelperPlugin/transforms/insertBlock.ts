import {Editor, Transforms, Range, Path} from 'slate'

import {v4 as uuid} from 'uuid'
import {InsertBlockOptions} from '../types'
import {ELEMENT_IMAGE, ELEMENT_BLOCK, ELEMENT_PARAGRAPH} from '../../elements'
import {ReactEditor} from 'slate-react'

export function insert(editor, {type, location}) {
  switch (type) {
    case ELEMENT_IMAGE:
      Transforms.insertNodes(
        editor,
        {
          type,
          id: uuid(),
          url: '',
          children: [{text: ''}],
        },
        {at: location},
      )
      return
    case ELEMENT_BLOCK:
      Transforms.insertNodes(
        editor,
        {
          type,
          id: uuid(),
          children: [
            {
              type: ELEMENT_PARAGRAPH,
              children: [{text: ''}],
            },
          ],
        },
        {at: location},
      )
      return
  }
}

export const insertBlock = (editor: Editor, options: InsertBlockOptions) => {
  if (Range.isRange(options.target)) {
    // is called from the editor with the `/`
    Transforms.delete(editor, {reverse: true, unit: 'line'})
    const parent = Editor.above(editor, {
      match: n => [ELEMENT_BLOCK].includes(n.type as string),
    })

    if (parent) {
      const [, parentBlockPath] = parent
      // const nextBlockPath = Path.next(parentBlockPath)

      if (options.type === ELEMENT_IMAGE) {
        insert(editor, {type: options.type, location: parentBlockPath})
      }
    }
  } else {
    // is called from the `+` button
    ReactEditor.focus(editor as ReactEditor)
    const nextPath = Path.next(options.target)
    if (Editor.string(editor, options.target)) {
      // if has content
      if (options.type === ELEMENT_BLOCK) {
        // content + block = insert below
        console.log('insertBlock => content + block')
        insert(editor, {type: options.type, location: nextPath})
        Transforms.select(editor, nextPath)
        return
      }

      if (options.type === ELEMENT_IMAGE) {
        // content + image = insert bellow + a new block below image
        console.log('insertBlock => content + image')
        insert(editor, {type: ELEMENT_BLOCK, location: nextPath})
        insert(editor, {type: options.type, location: nextPath})
      }
    } else {
      if (options.type === ELEMENT_BLOCK) {
        // blank + block = select current block
        console.log('insertBlock => blank + block')
        Transforms.select(editor, options.target)
        return
      }

      if (options.type === ELEMENT_IMAGE) {
        console.log('insertBlock => blank + image')
        // blank + image = insert image in the same path
        insert(editor, {type: options.type, location: options.target})
        Transforms.select(editor, nextPath)
      }
    }
  }
}
