import {css} from '@app/stitches.config'
import {Text, TextProps} from '@components/text'
import {forwardRef, PropsWithChildren} from 'react'

export const paragraphStyles = css({
  lineHeight: '$3',
  display: 'inline-block',
  width: '$full',
  borderRadius: '$3',
  '&[data-parent-type=blockquote]': {
    borderRadius: '$2',
    paddingVertical: '$5',
    marginHorizontal: '$2',
    position: 'relative',
    fontStyle: 'italic',
    color: '$text-alt',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '-$7',
      top: '-$5',
      bottom: 0,
      transform: 'translateX(-4px)',
      width: 4,
      borderRadius: '$2',
      // height: '$full',
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
  return <Text alt size="3" className={paragraphStyles()} ref={ref} {...props} />
})
