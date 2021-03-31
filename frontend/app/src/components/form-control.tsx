import { styled } from '@mintter/ui/stitches.config';

export const FORMCONTROL_TAG = 'input';

export const FormControl = styled(FORMCONTROL_TAG, {
  $$borderColor: '$colors$background-neutral',
  $$borderColorHover: '$colors$background-neutral-strong',
  $$backgroundColor: '$colors$background-default',
  all: 'unset',
  lineHeight: '1',
  height: '$5',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  fontSize: '$3',
  borderRadius: '$2',
  display: 'block',
  fontFamily: '$default',
  width: '100%',
  boxSizing: 'border-box',
  boxShadow: 'inset 0 0 0 1px $$borderColor',
  backgroundColor: '$$backgroundColor',
  outline: 'none',
  border: 'none',
  '&:before': {
    boxSizing: 'border-box',
  },
  '&:after': {
    boxSizing: 'border-box',
  },
  '&:hover': {
    boxShadow: 'inset 0 0 0 1px $$borderColorHover',
  },
  '&:active': {
    // backgroundColor: '$gray100',
    boxShadow: 'inset 0 0 0 1px $$borderColorHover',
  },
  '&:focus': {
    outline: 'none',
    boxShadow:
      'inset 0 0 0 1px $$borderColorHover, 0 0 0 1px $$borderColorHover',
  },
  '&:disabled': {
    // backgroundColor: '$gray200',
    boxShadow: 'inset 0 0 0 1px $$borderColor',
    pointerEvents: 'none',
    cursor: 'no-drop',
    opacity: 0.5,
  },
  variants: {
    variant: {
      danger: {
        $$borderColorHover: '$colors$danger-default',
        color: '$danger-default',
        backgroundColor: '$background-default',
        boxShadow:
          'inset 0 0 0 1px $$borderColorHover, 0 0 0 1px $$borderColorHover',
        '&:hover, &:active, &:focus, &:disabled': {
          boxShadow:
            'inset 0 0 0 1px $$borderColorHover, 0 0 0 1px $$borderColorHover',
        },
      },
    },
  },
});
