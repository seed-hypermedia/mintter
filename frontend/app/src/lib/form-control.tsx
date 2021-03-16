import { styled } from './stitches.config';

export const FORMCONTROL_TAG = 'input';

export const FormControl = styled(FORMCONTROL_TAG, {
  $$borderColor: '$colors$muted',
  $$borderColorHover: '$colors$mutedHover',
  all: 'unset',
  lineHeight: '1',
  // height: '$5',
  px: '$3',
  py: '$2',
  fontSize: '$3',
  borderRadius: '$1',
  display: 'block',
  fontFamily: '$paragraph',
  width: '100%',
  boxSizing: 'border-box',
  boxShadow: 'inset 0 0 0 1px $$borderColor',
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
    // bc: '$gray100',
    boxShadow: 'inset 0 0 0 1px $$borderColorHover',
  },
  '&:focus': {
    outline: 'none',
    boxShadow:
      'inset 0 0 0 1px $$borderColorHover, 0 0 0 1px $$borderColorHover',
  },
  '&:disabled': {
    // bc: '$gray200',
    boxShadow: 'inset 0 0 0 1px $$borderColor',
    pointerEvents: 'none',
    cursor: 'no-drop',
    opacity: 0.5,
  },
  variants: {
    variant: {
      danger: {
        $$borderColorHover: '$colors$accentDanger',
        color: '$accentDanger',
        bc: '$gray100',
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
