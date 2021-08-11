import type {Blockquote, Embed as EmbedType} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'

export const ELEMENT_EMBED = 'embed'

export const Embed = styled('q', {
  backgroundColor: '$secondary-softer',
  paddingVertical: '$1',
  paddingHorizontal: '$3',
  borderRadius: '$1',
  '&::before, &::after': {
    content: '',
  },
})

export const createEmbedPlugin = (): EditorPlugin => ({
  name: ELEMENT_EMBED,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_EMBED) {
      return (
        <Embed data-element-type={element.type} cite={(element as EmbedType).url} {...attributes}>
          {children}
        </Embed>
      )
    }
  },
})
