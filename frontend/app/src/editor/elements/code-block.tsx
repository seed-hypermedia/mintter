import type {Blockquote, Embed} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const ELEMENT_CODE = 'code'

export const CodeBlock = styled('pre', {
  backgroundColor: '$background-muted',
  padding: '$7',
  marginLeft: '-$5',
  marginRight: '-$5',
  marginVertical: '$3',
  position: 'relative',
  borderRadius: '$2',
  overflow: 'hidden',
})

export const createCodeBlockPlugin = (): EditorPlugin => ({
  name: ELEMENT_CODE,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_CODE) {
      return (
        <CodeBlock data-element-type={element.type} {...attributes}>
          {children}
        </CodeBlock>
      )
    }
  },
})
