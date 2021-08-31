import * as AccessibleIcon from '@radix-ui/react-accessible-icon'
import type * as Stitches from '@stitches/react'
import {useMemo} from 'react'

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
      inherit: {
        color: 'inherit',
      },
    },
  },

  defaultVariants: {
    size: '2',
    color: 'inherit',
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
  Strong,
  Emphasis,
  Paragraph,
  Heading,
  Underline,
  Strikethrough,
}

export type IconProps = Stitches.VariantProps<typeof Svg> & {
  name: keyof typeof icons
}

export function Icon({name, ...props}: IconProps): JSX.Element {
  const Component: React.ComponentType<any> = useMemo(() => icons[name], [name])
  const label = useMemo(
    () => `${Component.displayName?.replace(/([A-Z0-9])/g, ' $1').trim() ?? 'Unknown'} Icon`,
    [Component.displayName],
  )

  return (
    <AccessibleIcon.Root label={label}>
      <Component {...props} />
    </AccessibleIcon.Root>
  )
}

function Mintter(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={50} height={50} viewBox="0 0 50 50" {...props}>
      <path
        d="M23.153 24.991v7.204A1.82 1.82 0 0121.333 34c-1 0-1.804-.814-1.804-1.805V24.99a1.82 1.82 0 00-3.64 0v7.204A1.82 1.82 0 0114.067 34c-1 0-1.803-.814-1.803-1.805V24.99a1.82 1.82 0 00-3.642 0v7.204A1.82 1.82 0 016.803 34C5.803 34 5 33.186 5 32.195V24.99c0-2.973 2.445-5.398 5.444-5.398 1.392 0 2.66.53 3.623 1.38a5.383 5.383 0 013.624-1.38c3.016 0 5.462 2.425 5.462 5.398zm9.335-4.76c-1 0-1.82.813-1.82 1.804a1.82 1.82 0 003.64 0 1.81 1.81 0 00-1.82-1.805zm1.82 13.043a1.786 1.786 0 00.661-2.46c-.5-.867-1.606-1.15-2.481-.655a1.85 1.85 0 01-.91.248c-1 0-1.82-.814-1.82-1.805V17.805a1.82 1.82 0 00-3.642 0v10.797c0 2.973 2.445 5.398 5.444 5.398a5.45 5.45 0 002.749-.726zm8.979-14.3c-1 0-1.82.814-1.82 1.805a1.82 1.82 0 003.64 0 1.82 1.82 0 00-1.82-1.805zm1.803 14.3a1.786 1.786 0 00.66-2.46c-.5-.867-1.606-1.15-2.481-.655a1.85 1.85 0 01-.91.248c-1 0-1.82-.814-1.82-1.805V17.805c.017-.99-.804-1.805-1.804-1.805s-1.82.814-1.82 1.805v10.797c0 2.973 2.445 5.398 5.444 5.398.964 0 1.91-.248 2.73-.726z"
        fill="currentColor"
      />
    </Svg>
  )
}

function ArrowUp(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(90)" {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowDown(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(-90)" {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(0)" {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(180)" {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTopLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(90)" {...props}>
      <path d="M17 7L7 17M17 17H7V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTopRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(180)" {...props}>
      <path d="M17 7L7 17M17 17H7V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowBottomLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(0)" {...props}>
      <path d="M17 7L7 17M17 17H7V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowBottomRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(-90)" {...props}>
      <path d="M17 7L7 17M17 17H7V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTurnTopLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(180)" {...props}>
      <path d="M15 10l5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4v7a4 4 0 004 4h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTurnTopRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(180)" {...props}>
      <path d="M9 10l-5 5 5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4v7a4 4 0 01-4 4H4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTurnBottomLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(0)" {...props}>
      <path d="M9 10l-5 5 5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4v7a4 4 0 01-4 4H4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
function ArrowTurnBottomRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(0)" {...props}>
      <path d="M15 10l5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4v7a4 4 0 004 4h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowChevronUp(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(90)" {...props}>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowChevronDown(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(270)" {...props}>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowChevronLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(0)" {...props}>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowChevronRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(180)" {...props}>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTriangleUp(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(90)" {...props}>
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path d="M14 16l-6-4 6-4v8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTriangleDown(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(270)" {...props}>
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path d="M14 16l-6-4 6-4v8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTriangleLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(0)" {...props}>
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path d="M14 16l-6-4 6-4v8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ArrowTriangleRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(180)" {...props}>
      <path d="M14 16l-6-4 6-4" fill="currentColor" />
      <path d="M14 16l-6-4 6-4v8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Sort(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path d="M16 10l-4-6-4 6" fill="currentColor" />
      <path d="M16 10l-4-6-4 6h8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 14l4 6 4-6" fill="currentColor" />
      <path d="M8 14l4 6 4-6H8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Copy(props: Stitches.VariantProps<typeof Svg>) {
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

function Maximize(props: Stitches.VariantProps<typeof Svg>) {
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

function Minimize(props: Stitches.VariantProps<typeof Svg>) {
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

function Add(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function AddCircle(props: Stitches.VariantProps<typeof Svg>) {
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

function Close(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(45)" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CloseCircle(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" transform="rotate(45)" {...props}>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v8M8 12h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Clock(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Link(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 15H6.99999C5.34999 15 3.99999 13.65 3.99999 12C3.99999 10.35 5.34999 8.99998 6.99999 8.99998H11V6.99998H6.99999C4.23999 6.99998 1.99999 9.23998 1.99999 12C1.99999 14.76 4.23999 17 6.99999 17H11V15ZM17 6.99998H13V8.99998H17C18.65 8.99998 20 10.35 20 12C20 13.65 18.65 15 17 15H13V17H17C19.76 17 22 14.76 22 12C22 9.23998 19.76 6.99998 17 6.99998ZM16 11H7.99999V13H16V11Z"
        fill="currentColor"
      />
    </Svg>
  )
}

function ExternalLink(props: Stitches.VariantProps<typeof Svg>) {
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

function File(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 2v7h7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function HelpCircle(props: Stitches.VariantProps<typeof Svg>) {
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

function MessageBubble(props: Stitches.VariantProps<typeof Svg>) {
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

function MoreHorizontal(props: Stitches.VariantProps<typeof Svg>) {
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

function Grid4(props: Stitches.VariantProps<typeof Svg>) {
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

function Grid6(props: Stitches.VariantProps<typeof Svg>) {
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

function GearOutlined(props: Stitches.VariantProps<typeof Svg>) {
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

function Strong(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.225 11.79C16.195 11.12 16.875 10.02 16.875 9C16.875 6.74 15.125 5 12.875 5H6.625V19H13.665C15.755 19 17.375 17.3 17.375 15.21C17.375 13.69 16.515 12.39 15.225 11.79ZM9.625 7.5H12.625C13.455 7.5 14.125 8.17 14.125 9C14.125 9.83 13.455 10.5 12.625 10.5H9.625V7.5ZM9.625 16.5H13.125C13.955 16.5 14.625 15.83 14.625 15C14.625 14.17 13.955 13.5 13.125 13.5H9.625V16.5Z"
        fill="currentColor"
      />
    </Svg>
  )
}

function Emphasis(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 5V8H12.21L8.79 16H6V19H14V16H11.79L15.21 8H18V5H10Z"
        fill="currentColor"
      />
    </Svg>
  )
}

function Paragraph(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.144 18.5c-.094-.188-.17-.521-.229-1.002-.756.785-1.658 1.178-2.707 1.178-.937 0-1.708-.264-2.312-.791C3.3 17.352 3 16.678 3 15.863c0-.99.375-1.758 1.125-2.303.756-.55 1.816-.826 3.182-.826h1.582v-.747c0-.568-.17-1.02-.51-1.353-.34-.34-.84-.51-1.503-.51-.58 0-1.066.146-1.459.44-.393.292-.589.647-.589 1.063H3.193c0-.475.167-.932.501-1.371.34-.445.797-.797 1.371-1.055a4.643 4.643 0 011.908-.387c1.095 0 1.954.276 2.575.827.62.544.943 1.297.967 2.258v4.377c0 .873.111 1.568.334 2.083v.141H9.144zm-2.699-1.24c.51 0 .993-.131 1.45-.395.458-.263.789-.606.994-1.028v-1.951H7.614c-1.992 0-2.988.583-2.988 1.749 0 .51.17.908.51 1.195.34.287.776.43 1.31.43zM21.474 13.85c0 1.454-.334 2.623-1.002 3.507-.668.88-1.564 1.319-2.69 1.319-1.2 0-2.129-.425-2.785-1.275l-.08 1.099h-1.493V5h1.626v5.036c.656-.814 1.561-1.222 2.715-1.222 1.155 0 2.06.437 2.716 1.31.662.873.993 2.068.993 3.586v.14zm-1.626-.184c0-1.107-.214-1.963-.641-2.566-.428-.604-1.043-.906-1.846-.906-1.072 0-1.843.498-2.312 1.494v4.114c.498.996 1.275 1.494 2.33 1.494.779 0 1.385-.302 1.819-.905.433-.604.65-1.512.65-2.725z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Heading(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M5 4.5v3h5.5v12h3v-12H19v-3H5z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Underline(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M5.00001 2.75C5.00001 2.47386 4.77615 2.25 4.50001 2.25C4.22387 2.25 4.00001 2.47386 4.00001 2.75V8.05C4.00001 9.983 5.56702 11.55 7.50001 11.55C9.43301 11.55 11 9.983 11 8.05V2.75C11 2.47386 10.7762 2.25 10.5 2.25C10.2239 2.25 10 2.47386 10 2.75V8.05C10 9.43071 8.88072 10.55 7.50001 10.55C6.1193 10.55 5.00001 9.43071 5.00001 8.05V2.75ZM3.49998 13.1001C3.27906 13.1001 3.09998 13.2791 3.09998 13.5001C3.09998 13.721 3.27906 13.9001 3.49998 13.9001H11.5C11.7209 13.9001 11.9 13.721 11.9 13.5001C11.9 13.2791 11.7209 13.1001 11.5 13.1001H3.49998Z"
        fill="currentColor"
      />
    </Svg>
  )
}

function Strikethrough(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M5.00003 3.25C5.00003 2.97386 4.77617 2.75 4.50003 2.75C4.22389 2.75 4.00003 2.97386 4.00003 3.25V7.10003H2.49998C2.27906 7.10003 2.09998 7.27912 2.09998 7.50003C2.09998 7.72094 2.27906 7.90003 2.49998 7.90003H4.00003V8.55C4.00003 10.483 5.56703 12.05 7.50003 12.05C9.43303 12.05 11 10.483 11 8.55V7.90003H12.5C12.7209 7.90003 12.9 7.72094 12.9 7.50003C12.9 7.27912 12.7209 7.10003 12.5 7.10003H11V3.25C11 2.97386 10.7762 2.75 10.5 2.75C10.2239 2.75 10 2.97386 10 3.25V7.10003H5.00003V3.25ZM5.00003 7.90003V8.55C5.00003 9.93071 6.11932 11.05 7.50003 11.05C8.88074 11.05 10 9.93071 10 8.55V7.90003H5.00003Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}
