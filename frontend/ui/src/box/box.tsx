import {generateVariantsForScale, styled} from '../stitches.config'

const Box = styled('div', {
  boxSizing: 'border-box',

  variants: {
    padding: generateVariantsForScale('space', 'padding'),
  },
})

export {Box}
