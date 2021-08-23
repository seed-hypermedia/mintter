import {styled} from '@mintter/ui/stitches.config'

import type * as Polymorphic from '@radix-ui/react-polymorphic'
import {forwardRef} from 'react'

const DEFAULT_TAG = 'div'

const StyledContainer: any = styled(DEFAULT_TAG, {
  // Reset
  boxSizing: 'border-box',
  flexShrink: 0,

  // Custom
  width: '90%',
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',

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
    size: '2',
  },
})

export const Container: any = forwardRef((props, forwardedRef) => <StyledContainer {...props} ref={forwardedRef} />)
Container.displayName = 'Container'
