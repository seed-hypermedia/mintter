import {styled} from '@app/stitches.config'

export const Box = styled('div', {
  boxSizing: 'border-box',
})

export type BoxProps = React.ComponentProps<typeof Box>
