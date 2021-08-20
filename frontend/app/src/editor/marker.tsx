import {Editor} from 'slate'
import type {NodeEntry} from 'slate'
import {Box} from '@mintter/ui/box'
import {Text} from '@mintter/ui/text'
import {ReactEditor, useSlateStatic} from 'slate-react'
import type {GroupingContent} from '@mintter/mttast'
import {ELEMENT_UNORDERED_LIST} from './elements/unordered-list'
import {ELEMENT_ORDERED_LIST} from './elements/ordered-list'

function Disc() {
  return (
    <Box
      css={{
        width: 6,
        height: 6,
        backgroundColor: '$background-contrast',
        borderRadius: '$round',
      }}
    />
  )
}

export function Marker({element}) {
  const {type, path} = useParentType(element)

  if (type == ELEMENT_UNORDERED_LIST || type == ELEMENT_ORDERED_LIST) {
    return (
      <Box
        contentEditable={false}
        css={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {type == ELEMENT_UNORDERED_LIST ? (
          <Disc />
        ) : type == ELEMENT_ORDERED_LIST ? (
          <Text>{`${path[path.length - 1] + 1}.`}</Text>
        ) : null}
      </Box>
    )
  }

  return null
}

function useParentType(element) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const parent: NodeEntry<GroupingContent> = Editor.parent(editor, path)
  if (parent)
    return {
      type: parent[0].type,
      path,
    }
}
