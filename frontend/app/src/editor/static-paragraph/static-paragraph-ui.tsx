import {css} from '@mintter/ui/stitches.config'
import {Text, TextProps} from '@mintter/ui/text'
import {forwardRef, MouseEventHandler, PropsWithChildren} from 'react'

export const staticParagraphStyles = css({
  // fontWeight: '$bold',
  // marginTop: '1.5em',
})

type StaticParagraphUIProps = PropsWithChildren<
  TextProps & {
    as: 'h2' | 'h3' | 'h4' | 'h5' | 'p'
    className?: string
    onMouseEnter?: MouseEventHandler<HTMLHeadingElement>
  }
>

export const StaticParagraphUI = forwardRef<HTMLHeadingElement, StaticParagraphUIProps>(
  function forwardedStaticParagraphUI({className, ...props}, ref) {
    return <Text fontWeight="bold" ref={ref} className={staticParagraphStyles()} {...props} />
  },
)
