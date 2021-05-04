import {forwardRef} from 'react'
import * as RadixLabel from '@radix-ui/react-label'
import {StitchesVariants} from '@stitches/core'
import type * as Polymorphic from '@radix-ui/react-polymorphic'
import {styled, StitchesCss} from 'shared/stitches.config'

const DEFAULT_TAG = RadixLabel.DEFAULT_TAG

const StyledLabel = styled(RadixLabel.Root, {
  fontSize: '$1',
  variants: {
    variant: {
      danger: {
        color: '$accentDanger',
      },
    },
  },
})

type LabelCSSProp = Pick<StitchesCss<typeof StyledLabel>, 'css'>
type LabelVariants = StitchesVariants<typeof StyledLabel>
type LabelOwnProps = LabelCSSProp & LabelVariants & {error: boolean}

export type LabelComponent = Polymorphic.ForwardRefComponent<
  typeof DEFAULT_TAG,
  LabelOwnProps
>

export const Label = forwardRef(({error = false, ...props}, forwardedRef) => {
  return (
    <StyledLabel
      as="label"
      ref={forwardedRef}
      variant={error ? 'danger' : ''}
      {...props}
    />
  )
}) as LabelComponent
