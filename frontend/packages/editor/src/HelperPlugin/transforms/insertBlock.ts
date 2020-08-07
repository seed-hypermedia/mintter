import {
  Editor,
  Transforms,
  // Path,
  Range,
} from 'slate'

import {v4 as uuid} from 'uuid'
import {InsertBlockOptions} from '../types'
import {ELEMENT_IMAGE, ELEMENT_BLOCK, ELEMENT_PARAGRAPH} from '../../elements'

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

export function set(editor, {type, location}) {
  switch (type) {
    case ELEMENT_IMAGE:
      Transforms.setNodes(
        editor,
        {
          type,
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
    if (Editor.string(editor, options.target)) {
    }
    console.log('inEmpty => ', Editor.string(editor, options.target))
    const parent = Editor.above(editor, {
      match: n => [ELEMENT_BLOCK].includes(n.type as string),
    })

    if (parent) {
      const [, parentBlockPath] = parent
      // const nextBlockPath = Path.next(parentBlockPath)

      if (options.type === ELEMENT_IMAGE) {
        Transforms.insertNodes(
          editor,
          {
            type: options.type,
            id: uuid(),
            url: '',
            children: [{text: ''}],
          },
          {at: parentBlockPath},
        )
      }
    }
  } else {
    // is called from the `+` button
    // const nextPath = Path.next(options.target)

    if (options.type === ELEMENT_IMAGE) {
      Transforms.insertNodes(
        editor,
        {
          type: options.type,
          id: uuid(),
          url: '',
          children: [{text: ''}],
        },
        {at: options.target},
      )
    } else {
      if (Editor.string(editor, options.target)) {
        insert(editor, {type: options.type, location: options.target})
      } else {
        Transforms.select(editor, options.target)
      }
    }
  }
}
