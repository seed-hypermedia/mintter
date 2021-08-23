import {styled} from '@mintter/ui/stitches.config'
import {Icon} from '@mintter/ui/icon'
import type {EditorPlugin} from '../types'
import {Dragger, Tools} from './statement'
import {Marker} from '../marker'
import {Transforms} from 'slate'
import type {NodeEntry} from 'slate'
import {Editor, Path} from 'slate'
import type {Heading as HeadingType} from '@mintter/mttast'
import type {MTTEditor} from '../utils'
import {group, statement} from '@mintter/mttast-builder'
import {ELEMENT_PARAGRAPH} from './paragraph'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('li', {
  marginTop: '$3',
  display: 'grid',
  gridTemplateColumns: '$space$8 1fr',
  gridTemplateRows: 'auto auto',
  gap: '0 $2',
  gridTemplateAreas: `"controls content"
  ". children"`,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },

  "& > [data-element-type='staticParagraph']": {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement({attributes, children, element}) {
    // TODO: compute heading level
    if (element.type === ELEMENT_HEADING) {
      return (
        <Heading {...attributes}>
          <Tools contentEditable={false}>
            <Dragger>
              <Icon name="Grid6" size="2" color="muted" />
            </Dragger>
            <Marker element={element} />
          </Tools>
          {children}
        </Heading>
      )
    }
  },
  configureEditor: (editor) => {
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (node.type == ELEMENT_HEADING) {
      }
      normalizeNode(entry)
    }
    return editor
  },
})
