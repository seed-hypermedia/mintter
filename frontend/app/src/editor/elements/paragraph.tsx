import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Text} from '@mintter/ui/text'
import {Node, Path} from 'slate'

export const ELEMENT_PARAGRAPH = 'paragraph'

const Paragraph = styled(Text, {})

export const createParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_PARAGRAPH,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_PARAGRAPH) {
      return (
        <Paragraph as="p" alt size="4" css={{paddingLeft: '$2'}} {...attributes}>
          {children}
        </Paragraph>
      )
    }
  },
  configureEditor: (editor) => {
    const {normalizeNode, insertNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (node.type == ELEMENT_PARAGRAPH) {
        if (Path.hasPrevious(path)) {
          const prevNode = Node.get(editor, Path.previous(path))
          console.log('🚀 ~ file: paragraph.tsx ~ line 28 ~ prevNode', prevNode)
          // wrap the paragraph with a statement
          // check if there's a group child
          //  yes: add the new statement as first group child
          //  no: add statement as the same level of top statement
        }
      }
    }
  },
})
