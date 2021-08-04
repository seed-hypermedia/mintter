import {Editor, NodeEntry} from 'slate'
import {Box} from '@mintter/ui/box'
import {Text} from '@mintter/ui/text'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {useMemo} from 'react'
import type {GroupingContent} from '@mintter/mttast'
import {ELEMENT_GROUP} from './elements/group'
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
  return (
    type != ELEMENT_GROUP && (
      <Box
        contentEditable={false}
        css={{
          width: 24,
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
  )
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
