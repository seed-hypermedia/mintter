import {styled} from '@app/stitches.config'

export const EmbedUI = styled('q', {
  borderRadius: '$1',
  transition: 'all ease-in-out 0.1s',
  borderBottom: '3px solid $colors$base-component-bg-normal',

  '&:hover': {
    borderBottomColor: '$secondary-border-subtle',
    cursor: 'pointer',
  },
})
