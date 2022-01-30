import {css, keyframes, styled} from '@app/stitches.config'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

const slideUpAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideRightAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(-2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

const slideDownAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(-2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideLeftAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

export const dropdownContentStyle = css({
  minWidth: 220,
  backgroundColor: '$background-muted',
  borderRadius: 6,
  padding: 5,
  boxShadow: '0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)',
  '@media (prefers-reduced-motion: no-preference)': {
    animationDuration: '400ms',
    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform, opacity',
    '&[data-state="open"]': {
      '&[data-side="top"]': {animationName: slideDownAndFade},
      '&[data-side="right"]': {animationName: slideLeftAndFade},
      '&[data-side="bottom"]': {animationName: slideUpAndFade},
      '&[data-side="left"]': {animationName: slideRightAndFade},
    },
  },
})

export const dropdownItemStyle = css({
  display: 'flex',
  fontSize: '$2',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'start',
  fontFamily: '$default',
  gap: '$4',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  borderRadius: '$2',
  cursor: 'pointer',
  '&:focus': {
    outline: 'none',
    backgroundColor: '$background-neutral',
    cursor: 'pointer',
  },
  '&:disabled': {
    opacity: 0.5,
  },
})

const DropdownContent = styled(DropdownMenuPrimitive.Content, dropdownContentStyle)
const DropdownItem = styled(DropdownMenuPrimitive.Item, dropdownItemStyle)

const StyledSeparator = styled(DropdownMenuPrimitive.Separator, {
  height: 1,
  backgroundColor: '$background-neutral',
  margin: 8,
})

export const Dropdown = {
  ...DropdownMenuPrimitive,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: StyledSeparator,
}

export var ElementDropdown = styled('button', {
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$2',
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
    cursor: 'pointer',
  },
})
