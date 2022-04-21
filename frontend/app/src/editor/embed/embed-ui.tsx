import {styled} from '@app/stitches.config'

export const EmbedUI = styled('q', {
  borderRadius: '$1',
  transition: 'all ease-in-out 0.1s',
  borderBottom: '3px solid $colors$background-neutral-soft',

  '&:hover': {
    borderBottomColor: '$background-neutral-strong',
    cursor: 'pointer',
  },

  // '&::before, &::after': {
  //   fontWeight: '$bold',
  //   fontSize: '1.4em',
  //   color: '$text-alt',
  // },
  // '&::before': {
  //   content: '[',
  // },
  // '&::after': {
  //   content: ']',
  // },
})
