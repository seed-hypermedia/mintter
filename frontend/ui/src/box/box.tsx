import {styled} from '../stitches.config'

export type BoxProps = React.ComponentProps<typeof Box>

export const Box = styled('div', {
  boxSizing: 'border-box',
})
