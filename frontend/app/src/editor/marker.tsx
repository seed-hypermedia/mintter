import type {GroupingContent} from '@mintter/mttast'
import type {NodeEntry} from 'slate'
import {isGroupContent} from '@mintter/mttast'
import {Editor} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {ELEMENT_UNORDERED_LIST} from './elements/unordered-list'
import {ELEMENT_ORDERED_LIST} from './elements/ordered-list'
import {styled} from '@mintter/ui/stitches.config'

export const MarkerStyled = styled('div', {
  width: '$space$8',
  height: '$space$8',
  display: 'flex',
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  '&::before': {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  variants: {
    groupType: {
      unorderedList: {
        '&::before': {
          content: '●',
          color: '$background-contrast',
        },
      },
      orderedList: {
        '&::before': {
          width: '$space$8',
          height: '$space$8',
          counterIncrement: 'section',
          content: 'counters(section, ".") "."',
        },
      },
      group: {
        '&::before': {
          // display: 'none',
          content: '●',
          color: '$background-contrast',
        },
      },
    },
  },
})

export function Marker({element}) {
  const {type} = useParentType(element)

  if (type == ELEMENT_UNORDERED_LIST || type == ELEMENT_ORDERED_LIST) {
    return <MarkerStyled groupType={type} data-tool="marker" contentEditable={false} />
  }

  return null
}

function useParentType(element) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const parent: NodeEntry<GroupingContent> | undefined = Editor.above(editor, {
    at: path,
    match: isGroupContent,
  })
  if (parent) {
    return {
      type: parent[0].type,
      path,
    }
  }
}
