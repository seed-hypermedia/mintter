import {styled, XStack} from 'tamagui'

export const ResizeHandle = styled(XStack, {
  position: 'absolute',
  width: '8px',
  height: '32px',
  bg: '$color',
  borderColor: 'white',
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: '5px',
  cursor: 'ew-resize',
})
