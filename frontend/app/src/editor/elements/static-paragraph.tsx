import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Text} from '@mintter/ui/text'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {Editor} from 'slate'
import type {NodeEntry} from 'slate'
import type {Heading} from '@mintter/mttast'
import {ELEMENT_HEADING} from './heading'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

const StaticParagraph = styled(Text, {
  // padding: '$1',
  // display: 'block',
  // paddingHorizontal: '$3',
  // margin: 0,
  // borderRadius: '$1',
  // transition: 'all 0.1s ease',
  // '&:hover': {
  //   backgroundColor: '$background-muted',
  // },
  // fontFamily: '$alt',
  fontWeight: '$bold',
  padding: 0,
})

const headingMap = {
  2: {
    as: 'h2',
    size: 8,
  },
  4: {
    as: 'h3',
    size: 7,
  },
  6: {
    as: 'h4',
    size: 6,
  },
  8: {
    as: 'h5',
    size: 5,
  },
  default: {
    as: 'p',
    size: 4,
  },
}

export const createStaticParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATIC_PARAGRAPH,
  renderElement({attributes, children, element}) {
    const editor = useSlateStatic()
    const level = useHeadingLevel(element)
    if (element.type === ELEMENT_STATIC_PARAGRAPH) {
      const sizeProps = headingMap[level ?? 'default']
      return (
        <StaticParagraph
          {...sizeProps}
          data-element-type={element.type}
          css={{paddingLeft: '$2', fontWeight: level ? '$bold' : '$regular', marginBottom: '$5'}}
          {...attributes}
        >
          {children}
        </StaticParagraph>
      )
    }
  },
})

function useHeadingLevel(element) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  console.log('🚀 ~ file: static-paragraph.tsx ~ line 75 ~ useHeadingLevel ~ path', path)
  const parent: NodeEntry<Heading> = Editor.parent(editor, path)
  if (parent) {
    const [node, path] = parent
    console.log('🚀 ~ file: static-paragraph.tsx ~ line 78 ~ useHeadingLevel ~ parent', path)
    if (node.type == ELEMENT_HEADING) {
      return path.length
    }
  }
}
