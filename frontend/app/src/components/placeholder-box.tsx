import {css, keyframes, styled} from '@app/stitches.config'

const loadingAnimation = keyframes({
  '100%': {transform: 'translateX(100%)'},
})
const placeholderWrapperStyle = css({
  width: '$full',
  backgroundColor: '$background-neutral',
  position: 'relative',
  overflow: 'hidden',
  '&:after': {
    content: `''`,
    position: 'absolute',
    left: 0,
    top: 0,
    transform: 'translateX(-100%)',
    height: '100%',
    width: '100%',
    zIndex: '45',
    backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
    animation: `${loadingAnimation} 1.2s infinite`,
  },
})

export const Placeholder = styled('div', placeholderWrapperStyle)
