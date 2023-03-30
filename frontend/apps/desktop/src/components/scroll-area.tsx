import { styled } from '@app/stitches.config'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { forwardRef, PropsWithChildren } from 'react'

const SCROLLBAR_SIZE = 6

export const StyledScrollArea = styled(ScrollAreaPrimitive.Root, {
  width: '$full',
  height: '$full',
  overflow: 'hidden',
})

export const ScrollViewport = styled(ScrollAreaPrimitive.Viewport, {
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
})

export const ScrollBar = styled(ScrollAreaPrimitive.Scrollbar, {
  display: 'flex',
  // ensures no selection
  zIndex: '$max',
  userSelect: 'none',
  // disable browser handling of all panning and zooming gestures on touch devices
  touchAction: 'none',
  padding: 2,
  background: '$base-component-bg-hover',
  transition: 'background 160ms ease-out',
  '&:hover': { background: '$base-component-bg-active' },
  '&[data-orientation="vertical"]': { width: SCROLLBAR_SIZE },
})

export const ScrollBarThumb = styled(ScrollAreaPrimitive.Thumb, {
  flex: 1,
  background: '$base-normal',
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

export type ScrollAreaProps = PropsWithChildren<
  Partial<{
    orientation: ScrollAreaPrimitive.ScrollAreaScrollbarVisibleProps['orientation']
    onScroll: ScrollAreaPrimitive.ScrollAreaViewportProps['onScroll']
    onMouseMove: ScrollAreaPrimitive.ScrollAreaViewportProps['onMouseMove']
    onMouseLeave: ScrollAreaPrimitive.ScrollAreaViewportProps['onMouseLeave']
  }>
>

export const ScrollArea = forwardRef<HTMLElement, ScrollAreaProps>(
  ({ children, orientation = 'vertical', onScroll }, ref) => {
    return (
      <StyledScrollArea type="hover">
        <ScrollViewport onScroll={onScroll}>{children}</ScrollViewport>
        <ScrollBar orientation={orientation}>
          <ScrollBarThumb />
        </ScrollBar>
      </StyledScrollArea>
    )
  }
)
