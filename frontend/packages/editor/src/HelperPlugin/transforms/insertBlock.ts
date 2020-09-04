import {Editor, Transforms, Range, Path} from 'slate'

import {v4 as uuid} from 'uuid'
import {InsertBlockOptions} from '../types'
import {ELEMENT_BLOCK} from '../../BlockPlugin/block'
import {ELEMENT_PARAGRAPH} from '../../elements/paragraph'
import {ReactEditor} from 'slate-react'

export function insert(editor, {type, location}) {
  const id = uuid()
  switch (type) {
    case 'img':
      Transforms.insertNodes(
        editor,
        {
          type,
          id,
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
          id,
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

      if (options.type === 'img') {
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

      if (options.type === 'img') {
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

      if (options.type === 'img') {
        console.log('insertBlock => blank + image')
        // blank + image = insert image in the same path
        insert(editor, {type: options.type, location: options.target})
        Transforms.select(editor, nextPath)
      }
    }
  }
}
