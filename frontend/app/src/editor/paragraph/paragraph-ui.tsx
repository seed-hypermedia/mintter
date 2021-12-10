import {css} from '@mintter/ui/stitches.config'
import {Text, TextProps} from '@mintter/ui/text'
import {forwardRef, PropsWithChildren} from 'react'

export const paragraphStyles = css({
  lineHeight: '$3',
  '&[data-parent-type=blockquote]': {
    borderRadius: '$2',
    paddingVertical: '$4',
    marginHorizontal: '$2',
    paddingLeft: '$5',
    position: 'relative',
    fontStyle: 'italic',
    color: '$text-alt',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      transform: 'translateX(-4px)',
      width: 4,
      borderRadius: '$2',
      height: '$full',
      backgroundColor: '$primary-soft',
    },
  },
  '&[data-parent-type=code]': {
    fontFamily: 'monospace',
    margin: 0,
    padding: 0,
  },
})

export const ParagraphUI = forwardRef<HTMLSpanElement, PropsWithChildren<TextProps>>(function forwardedParagraphUI(
  props,
  ref,
) {
  return <Text alt size="3" className={paragraphStyles()} style={{display: 'initial'}} ref={ref} {...props} />
})
