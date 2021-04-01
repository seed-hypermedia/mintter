import React from 'react';
import type * as Polymorphic from '@radix-ui/react-polymorphic';
import type {
  StitchesVariants,
  StitchesCss,
} from '@mintter/ui/stitches.config';
import { FormControl, FORMCONTROL_TAG } from './form-control';

type InputCSSProp = Pick<StitchesCss<typeof FormControl>, 'css'>;
type InputVariants = StitchesVariants<typeof FormControl>;
type InputOwnProps = InputCSSProp &
  InputVariants & {
    type?: 'text' | 'password' | 'email';
    name: string;
  };

export type InputComponent = Polymorphic.ForwardRefComponent<
  typeof FORMCONTROL_TAG,
  InputOwnProps
>;

// eslint-disable-next-line react/display-name
export const Input = React.forwardRef(
  ({ type = 'text', disabled = false, ...props }: any, ref) => (
    <FormControl type={type} ref={ref} disabled={disabled} {...props} />
  ),
) as any;
// TODO: fix types
// ) as InputComponent;
