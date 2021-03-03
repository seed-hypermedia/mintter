import React from 'react'
import {StitchesVariants} from '@stitches/core'
import {styled, CSS} from 'shared/stitches.config'

import type * as Polymorphic from '@radix-ui/react-polymorphic'

const DEFAULT_TAG = 'div'

type ContainerCSSProp = Pick<CSS<typeof StyledContainer>, 'css'>
type ContainerVariants = StitchesVariants<typeof StyledContainer>
type ContainerOwnProps = ContainerCSSProp & ContainerVariants

const StyledContainer = styled(DEFAULT_TAG, {
  // Reset
  boxSizing: 'border-box',
  flexShrink: 0,

  // Custom
  width: '90%',
  mx: 'auto',
  px: '$5',

  variants: {
    size: {
      1: {
        maxWidth: '430px',
      },
      2: {
        maxWidth: '715px',
      },
      3: {
        maxWidth: '1145px',
      },
      4: {
        maxWidth: 'none',
      },
    },
  },
  defaultVariants: {
    size: 2,
  },
})

type ContainerComponent = Polymorphic.ForwardRefComponent<
  typeof DEFAULT_TAG,
  ContainerOwnProps
>

export const Container = React.forwardRef((props, forwardedRef) => {
  return <StyledContainer {...props} ref={forwardedRef} />
}) as ContainerComponent
