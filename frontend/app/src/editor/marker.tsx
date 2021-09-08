import type {GroupingContent} from '@mintter/mttast'
import type {NodeEntry} from 'slate'
import {isGroupContent} from '@mintter/mttast'
import {Editor} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {ELEMENT_UNORDERED_LIST} from './elements/unordered-list'
import {ELEMENT_ORDERED_LIST} from './elements/ordered-list'
import {styled} from '@mintter/ui/stitches.config'

export const MarkerStyled = styled('div', {
  minWidth: '$space$8',
  width: 'auto',
  height: '$space$8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflowX: 'visible',
  flexDirection: 'row-reverse',
  color: '$text-muted',
  fontSize: '$2',
  '&::before': {
    position: 'absolute',
    alignItems: 'center',
    marginTop: '$1',
    display: 'flex',
    whiteSpace: 'nowrap',
    paddingRight: '$1',
  },
  variants: {
    groupType: {
      unorderedList: {
        '&::before': {
          width: '$space$2',
          height: '$space$2',
          content: '',
          background: '$background-contrast',
          borderRadius: '$round',
        },
      },
      orderedList: {
        '&::before': {
          height: '$space$8',
          counterIncrement: 'section',
          content: 'counters(section, ".") ". "',
          // content: 'counter(section) "."',
          // '& &::before': {
          //   content: 'counter(section, "roman") "."',
          // },
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
  const parent = useParentType(element)

  if ((parent && parent.type == ELEMENT_UNORDERED_LIST) || (parent && parent.type == ELEMENT_ORDERED_LIST)) {
    return <MarkerStyled groupType={parent.type} data-tool="marker" contentEditable={false} />
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
