import {Box} from '@mintter/ui/box'
import {styled} from '@mintter/ui/stitches.config'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
export function MainContent({children}: any) {
  return (
    <Box
      css={{
        gridArea: 'maincontent',
        width: '90%',
        marginBottom: 300,
        padding: '$5',
        paddingTop: '$8',
        marginHorizontal: '$4',
        '@bp2': {
          paddingTop: '$9',
          marginHorizontal: '$9',
        },
      }}
    >
      <ScrollArea>
        <Viewport>{children}</Viewport>
        <Scrollbar orientation="vertical">
          <Thumb />
        </Scrollbar>
        <Corner />
      </ScrollArea>
    </Box>
  )
}

const SCROLLBAR_SIZE = 10

var ScrollArea = styled(ScrollAreaPrimitive.Root, {
  width: '$full',
  height: '$full',
  overflow: 'hidden',
})

var Viewport = styled(ScrollAreaPrimitive.Viewport, {
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
})

var Scrollbar = styled(ScrollAreaPrimitive.Scrollbar, {
  display: 'flex',
  // ensures no selection
  userSelect: 'none',
  // disable browser handling of all panning and zooming gestures on touch devices
  touchAction: 'none',
  padding: 2,
  background: '$background-neutral-soft',
  transition: 'background 160ms ease-out',
  '&:hover': {background: '$background-neutral'},
  '&[data-orientation="vertical"]': {width: SCROLLBAR_SIZE},
})

var Thumb = styled(ScrollAreaPrimitive.Thumb, {
  flex: 1,
  background: '$background-neutral-strong',
  borderRadius: SCROLLBAR_SIZE,
  // increase target size for touch devices https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    minWidth: 44,
    minHeight: 44,
  },
})

var Corner = styled(ScrollAreaPrimitive.Corner, {
  background: 'blue',
})
