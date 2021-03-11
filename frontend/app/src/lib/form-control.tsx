import { styled } from './stitches.config';

export const FORMCONTROL_TAG = 'input';

export const FormControl = styled(FORMCONTROL_TAG, {
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
  boxShadow: 'inset 0 0 0 1px $colors$muted',
  outline: 'none',
  border: 'none',
  '&:before': {
    boxSizing: 'border-box',
  },
  '&:after': {
    boxSizing: 'border-box',
  },
  '&:hover': {
    boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
  },
  '&:active': {
    bc: '$gray100',
    boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
  },
  '&:focus': {
    outline: 'none',
    boxShadow:
      'inset 0 0 0 1px $colors$mutedHover, 0 0 0 1px $colors$mutedHover',
  },
  '&:disabled': {
    bc: '$gray200',
    boxShadow: 'inset 0 0 0 1px $colors$muted',
    pointerEvents: 'none',
    cursor: 'no-drop',
    opacity: 0.5,
  },
  variants: {
    variant: {
      danger: {
        color: '$accentDanger',
        bc: '$gray100',
        boxShadow:
          'inset 0 0 0 1px $colors$accentDanger, 0 0 0 1px $colors$accentDanger',
        '&:hover, &:active, &:focus, &:disabled': {
          boxShadow:
            'inset 0 0 0 1px $colors$accentDanger, 0 0 0 1px $colors$accentDanger',
        },
      },
    },
  },
});
