import type {Blockquote, Embed} from '@mintter/mttast'
import {Icon} from '@mintter/ui/icon'
import {Box} from '@mintter/ui/box'
import {styled} from '@mintter/ui/stitches.config'
import {Marker} from '../marker'
import type {EditorPlugin} from '../types'
import {Dragger, Tools} from './statement'

export const ELEMENT_CODE = 'code'

export const CodeBlock = styled('pre', {
  margin: 0,
  padding: 0,
  marginTop: '$3',
  marginHorizontal: '-$8',
  display: 'grid',
  gridTemplateColumns: '$space$8 1fr',
  gridTemplateRows: 'min-content auto',
  gap: '0 $2',
  gridTemplateAreas: `"controls content"
  ". children"`,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },

  "& > [data-element-type='paragraph']": {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

export const createCodeBlockPlugin = (): EditorPlugin => ({
  name: ELEMENT_CODE,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_CODE) {
      return (
        <CodeBlock data-element-type={element.type} {...attributes}>
          <Tools contentEditable={false}>
            <Dragger data-dragger>
              <Icon name="Grid6" size="2" color="muted" />
            </Dragger>
            <Marker element={element} />
          </Tools>
          <Box
            css={{
              backgroundColor: '$background-muted',
              padding: '$7',
              borderRadius: '$2',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {children}
          </Box>
        </CodeBlock>
      )
    }
  },
})
