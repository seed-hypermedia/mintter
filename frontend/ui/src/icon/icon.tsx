import * as AccessibleIcon from '@radix-ui/react-accessible-icon'
import React, {useMemo} from 'react'

import {styled} from '../stitches.config'

const Svg = styled('svg', {
  fill: 'none',

  variants: {
    size: {
      1: {
        zoom: 0.667,
      },
      2: {
        zoom: 1,
      },
      3: {
        zoom: 1.333,
      },
    },
    color: {
      default: {
        color: '$text-default',
      },
      alt: {
        color: '$text-alt',
      },
      muted: {
        color: '$text-muted',
      },
      opposite: {
        color: '$text-opposite',
      },
      contrast: {
        color: '$text-contrast',
      },
      primary: {
        color: '$primary-default',
      },
      secondary: {
        color: '$secondary-default',
      },
      terciary: {
        color: '$terciary-default',
      },
      success: {
        color: '$success-default',
      },
      warning: {
        color: '$warning-default',
      },
      danger: {
        color: '$danger-default',
      },
    },
  },

  defaultVariants: {
    size: '2',
    color: 'default',
  },
})

export const icons = {
  Mintter,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowTopLeft,
  ArrowTopRight,
  ArrowBottomLeft,
  ArrowBottomRight,
  ArrowTurnTopLeft,
  ArrowTurnTopRight,
  ArrowTurnBottomLeft,
  ArrowTurnBottomRight,
  ArrowChevronUp,
  ArrowChevronDown,
  ArrowChevronLeft,
  ArrowChevronRight,
  ArrowTriangleUp,
  ArrowTriangleDown,
  ArrowTriangleLeft,
  ArrowTriangleRight,
  Sort,
  Copy,
  Maximize,
  Minimize,
  Add,
  AddCircle,
  Close,
  CloseCircle,
  Clock,
  Link,
  ExternalLink,
  File,
  HelpCircle,
  MessageBubble,
  MoreHorizontal,
  Grid4,
  Grid6,
  GearOutlined,
}

export function Icon({
  name,
  ...props
}: React.ComponentProps<typeof Svg> & {
  name: keyof typeof icons
}) {
  const Component: React.ComponentType<any> = useMemo(() => icons[name], [name])

  const label = useMemo(
    () =>
      `${
        Component.displayName?.replace(/([A-Z0-9])/g, ' $1').trim() ?? 'Unknown'
      } Icon`,
    [Component.displayName],
  )

  return (
    <AccessibleIcon.Root label={label}>
      <Component {...props} />
    </AccessibleIcon.Root>
  )
}

export type IconProps = React.ComponentProps<typeof Icon>

function Mintter(props: any) {
  return (
    <Svg width={50} height={50} viewBox="0 0 50 50" {...props}>
      <path
        d="M23.153 24.991v7.204A1.82 1.82 0 0121.333 34c-1 0-1.804-.814-1.804-1.805V24.99a1.82 1.82 0 00-3.64 0v7.204A1.82 1.82 0 0114.067 34c-1 0-1.803-.814-1.803-1.805V24.99a1.82 1.82 0 00-3.642 0v7.204A1.82 1.82 0 016.803 34C5.803 34 5 33.186 5 32.195V24.99c0-2.973 2.445-5.398 5.444-5.398 1.392 0 2.66.53 3.623 1.38a5.383 5.383 0 013.624-1.38c3.016 0 5.462 2.425 5.462 5.398zm9.335-4.76c-1 0-1.82.813-1.82 1.804a1.82 1.82 0 003.64 0 1.81 1.81 0 00-1.82-1.805zm1.82 13.043a1.786 1.786 0 00.661-2.46c-.5-.867-1.606-1.15-2.481-.655a1.85 1.85 0 01-.91.248c-1 0-1.82-.814-1.82-1.805V17.805a1.82 1.82 0 00-3.642 0v10.797c0 2.973 2.445 5.398 5.444 5.398a5.45 5.45 0 002.749-.726zm8.979-14.3c-1 0-1.82.814-1.82 1.805a1.82 1.82 0 003.64 0 1.82 1.82 0 00-1.82-1.805zm1.803 14.3a1.786 1.786 0 00.66-2.46c-.5-.867-1.606-1.15-2.481-.655a1.85 1.85 0 01-.91.248c-1 0-1.82-.814-1.82-1.805V17.805c.017-.99-.804-1.805-1.804-1.805s-1.82.814-1.82 1.805v10.797c0 2.973 2.445 5.398 5.444 5.398.964 0 1.91-.248 2.73-.726z"
        fill="currentColor"
      />
    </Svg>
  )
}

function ArrowUp(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(90)"
      {...props}
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowDown(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(-90)"
      {...props}
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowLeft(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(0)"
      {...props}
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowRight(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(180)"
      {...props}
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTopLeft(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(90)"
      {...props}
    >
      <path
        d="M17 7L7 17M17 17H7V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTopRight(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(180)"
      {...props}
    >
      <path
        d="M17 7L7 17M17 17H7V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowBottomLeft(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(0)"
      {...props}
    >
      <path
        d="M17 7L7 17M17 17H7V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowBottomRight(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(-90)"
      {...props}
    >
      <path
        d="M17 7L7 17M17 17H7V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTurnTopLeft(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(180)"
      {...props}
    >
      <path
        d="M15 10l5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4v7a4 4 0 004 4h12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTurnTopRight(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(180)"
      {...props}
    >
      <path
        d="M9 10l-5 5 5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4v7a4 4 0 01-4 4H4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTurnBottomLeft(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(0)"
      {...props}
    >
      <path
        d="M9 10l-5 5 5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4v7a4 4 0 01-4 4H4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
function ArrowTurnBottomRight(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(0)"
      {...props}
    >
      <path
        d="M15 10l5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4v7a4 4 0 004 4h12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronUp(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(90)"
      {...props}
    >
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronDown(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(270)"
      {...props}
    >
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronLeft(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(0)"
      {...props}
    >
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronRight(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(180)"
      {...props}
    >
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTriangleUp(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(90)"
      {...props}
    >
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path
        d="M14 16l-6-4 6-4v8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTriangleDown(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(270)"
      {...props}
    >
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path
        d="M14 16l-6-4 6-4v8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTriangleLeft(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(0)"
      {...props}
    >
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path
        d="M14 16l-6-4 6-4v8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTriangleRight(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(180)"
      {...props}
    >
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path
        d="M14 16l-6-4 6-4v8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Sort(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path d="M16 10l-4-6-4 6" fill="currentColor" />
      <path
        d="M16 10l-4-6-4 6h8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 14l4 6 4-6" fill="currentColor" />
      <path
        d="M8 14l4 6 4-6H8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Copy(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Maximize(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Minimize(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Add(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function AddCircle(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v8M8 12h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Close(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(45)"
      {...props}
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function CloseCircle(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      transform="rotate(45)"
      {...props}
    >
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v8M8 12h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Clock(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6v6l4 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Link(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 15H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm6-8h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-1 4H8v2h8v-2z"
        fill="currentColor"
      />
    </Svg>
  )
}

function ExternalLink(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M19 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h6M16 2h6v6M11 13L22 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function File(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 2v7h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function HelpCircle(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3v1M12 17h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function MessageBubble(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.379 8.379 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function MoreHorizontal(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M11 12a1 1 0 102 0 1 1 0 00-2 0zM18 12a1 1 0 102 0 1 1 0 00-2 0zM4 12a1 1 0 102 0 1 1 0 00-2 0z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Grid4(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M8.5 17a1 1 0 100-2 1 1 0 000 2zM15.5 17a1 1 0 100-2 1 1 0 000 2zM8.5 10a1 1 0 100-2 1 1 0 000 2zM15.5 10a1 1 0 100-2 1 1 0 000 2z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Grid6(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M8.5 13a1 1 0 100-2 1 1 0 000 2zM15.5 13a1 1 0 100-2 1 1 0 000 2zM8.5 6a1 1 0 100-2 1 1 0 000 2zM15.5 6a1 1 0 100-2 1 1 0 000 2zM8.5 20a1 1 0 100-2 1 1 0 000 2zM15.5 20a1 1 0 100-2 1 1 0 000 2z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function GearOutlined(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.502 12c0 .34-.03.66-.07.98l2.11 1.65c.19.15.24.42.12.64l-2 3.46c-.09.16-.26.25-.43.25-.06 0-.12-.01-.18-.03l-2.49-1c-.52.39-1.08.73-1.69.98l-.38 2.65c-.03.24-.24.42-.49.42h-4c-.25 0-.46-.18-.49-.42l-.38-2.65c-.61-.25-1.17-.58-1.69-.98l-2.49 1a.5.5 0 01-.61-.22l-2-3.46a.505.505 0 01.12-.64l2.11-1.65a7.93 7.93 0 01-.07-.98c0-.33.03-.66.07-.98l-2.11-1.65a.493.493 0 01-.12-.64l2-3.46c.09-.16.26-.25.43-.25.06 0 .12.01.18.03l2.49 1c.52-.39 1.08-.73 1.69-.98l.38-2.65c.03-.24.24-.42.49-.42h4c.25 0 .46.18.49.42l.38 2.65c.61.25 1.17.58 1.69.98l2.49-1a.5.5 0 01.61.22l2 3.46c.12.22.07.49-.12.64l-2.11 1.65c.04.32.07.64.07.98zm-2 0c0-.21-.01-.42-.05-.73l-.14-1.13.89-.7 1.07-.85-.7-1.21-1.27.51-1.06.43-.91-.7c-.4-.3-.8-.53-1.23-.71l-1.06-.43-.16-1.13-.19-1.35h-1.39l-.2 1.35-.16 1.13-1.06.43c-.41.17-.82.41-1.25.73l-.9.68-1.04-.42-1.27-.51-.7 1.21 1.08.84.89.7-.14 1.13c-.03.3-.05.53-.05.73 0 .2.02.43.05.74l.14 1.13-.89.7-1.08.84.7 1.21 1.27-.51 1.06-.43.91.7c.4.3.8.53 1.23.71l1.06.43.16 1.13.19 1.35h1.4l.2-1.35.16-1.13 1.06-.43c.41-.17.82-.41 1.25-.73l.9-.68 1.04.42 1.27.51.7-1.21-1.08-.84-.89-.7.14-1.13c.03-.3.05-.52.05-.73zm-5.5-4c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-2 4c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2z"
        fill="currentColor"
      />
    </Svg>
  )
}
