import {styled} from '@app/stitches.config'

export const EmbedUI = styled('q', {
  borderRadius: '$1',
  transition: 'all ease-in-out 0.1s',
  borderBottom: '3px solid $colors$base-component-bg-normal',

  '&:hover': {
    borderBottomColor: '$base-component-bg-normal',
    cursor: 'pointer',
  },

  // '&::before, &::after': {
  //   fontWeight: '$bold',
  //   fontSize: '1.4em',
  //   color: '$base-text-low',
  // },
  // '&::before': {
  //   content: '[',
  // },
  // '&::after': {
  //   content: ']',
  // },
})
