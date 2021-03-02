import React from 'react'
import {Text} from './Text'

import * as Polymorphic from '@radix-ui/react-polymorphic'

const DEFAULT_TAG = 'h2'

type HeadingOwnProps = Omit<React.ComponentProps<typeof Text>, 'size'>
type HeadingComponent = Polymorphic.ForwardRefComponent<
  typeof DEFAULT_TAG,
  HeadingOwnProps
>

export const Heading = React.forwardRef((props, forwardedRef) => {
  const {as} = props
  if (!['h1', 'h2', 'h3'].includes(as)) {
    console.warn('The Heading component should only render H3 or above.')
  }
  return (
    <Text
      as={DEFAULT_TAG}
      {...props}
      ref={forwardedRef}
      size={{
        initial: '6',
        bp2: '7',
      }}
      css={{
        fontWeight: '$4',
        fontFamily: '$heading',
        fontVariantNumeric: 'proportional-nums',
        lineHeight: '25px',
        ...(props.css as any),

        bp2: {
          lineHeight: '30px',
          ...(props.css?.bp2 as any),
        },
      }}
    />
  ) as HeadingComponent
})
