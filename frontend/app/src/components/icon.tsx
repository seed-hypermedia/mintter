import {CSS, css, styled} from '@app/stitches.config'
import type * as Stitches from '@stitches/react'
import {useMemo} from 'react'

export const Svg = styled('svg', {
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
        color: '$base-text-hight',
      },
      alt: {
        color: '$base-text-low',
      },
      muted: {
        color: '$base-text-low',
      },
      opposite: {
        color: '$base-text-opposite',
      },
      contrast: {
        color: '$base-text-low',
      },
      primary: {
        color: '$primary-normal',
      },
      'primary-opposite': {
        color: '$primary-text-opposite',
      },
      secondary: {
        color: '$secondary-normal',
      },
      success: {
        color: '$success-normal',
      },
      warning: {
        color: '$warning-normal',
      },
      danger: {
        color: '$danger-normal',
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
  Camera,
  Code,
  Copy,
  Maximize,
  Minimize,
  Add,
  AddCircle,
  BulletList,
  CardStackPlus,
  Close,
  CloseCircle,
  Clock,
  Link,
  Emphasis,
  ExternalLink,
  File,
  Grid4,
  Grid6,
  GearOutlined,
  Heading,
  HelpCircle,
  Image,
  List,
  MessageBubble,
  MoreHorizontal,
  OrderedList,
  OpenInNewWindow,
  Paragraph,
  Pencil,
  PencilAdd,
  Person,
  Reload,
  Strikethrough,
  Sidepanel,
  Sidenav,
  Star,
  Strong,
  Underline,
  Video,
  Search,
}

export type IconProps = Stitches.VariantProps<typeof Svg> & {
  name: keyof typeof icons
  css?: CSS
}

let preventSelect = css({userSelect: 'none'})

export function Icon({name, css, ...props}: IconProps) {
  const Component = useMemo(() => icons[name], [name])

  // @ts-ignore
  return <Component {...props} css={css} className={preventSelect()} />
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
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M12 19L12 5M12 5L5 12M12 5L19 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowDown(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M12 5L12 19M12 19L19 12M12 19L5 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M5 12H19M19 12L12 5M19 12L12 19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTopLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M17 17L7 7M7 7L7 17M7 7L17 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTopRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M7 17L17 7M17 7H7M17 7V17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowBottomLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M17 7L7 17M7 17H17M7 17V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowBottomRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M7 7L17 17M17 17L17 7M17 17L7 17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTurnTopLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M10 13L5 8M5 8L10 3M5 8H17C18.0609 8 19.0783 8.42143 19.8284 9.17157C20.5786 9.92172 21 10.9391 21 12V19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTurnTopRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M16 13L21 8M21 8L16 3M21 8H9C7.93913 8 6.92172 8.42143 6.17157 9.17157C5.42143 9.92172 5 10.9391 5 12V19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTurnBottomLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M9 10L4 15M4 15L9 20M4 15H16C17.0609 15 18.0783 14.5786 18.8284 13.8284C19.5786 13.0783 20 12.0609 20 11V4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
function ArrowTurnBottomRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M15 10L20 15M20 15L15 20M20 15H8C6.93913 15 5.92172 14.5786 5.17157 13.8284C4.42143 13.0783 4 12.0609 4 11V4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronUp(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M18 15L12 9L6 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronDown(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowChevronRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M10 18L16 12L10 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTriangleUp(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path d="M16 15L12 9L8 15" fill="currentColor" />
      <path
        d="M16 15L12 9L8 15H16Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTriangleDown(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path d="M8 10L12 16L16 10" fill="currentColor" />
      <path
        d="M8 10L12 16L16 10H8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ArrowTriangleLeft(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
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

function ArrowTriangleRight(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path d="M10 16L16 12L10 8" fill="currentColor" />
      <path
        d="M10 16L16 12L10 8V16Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Sort(props: Stitches.VariantProps<typeof Svg>) {
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

function Camera(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M2 3C1.44772 3 1 3.44772 1 4V11C1 11.5523 1.44772 12 2 12H13C13.5523 12 14 11.5523 14 11V4C14 3.44772 13.5523 3 13 3H2ZM0 4C0 2.89543 0.895431 2 2 2H13C14.1046 2 15 2.89543 15 4V11C15 12.1046 14.1046 13 13 13H2C0.895431 13 0 12.1046 0 11V4ZM2 4.25C2 4.11193 2.11193 4 2.25 4H4.75C4.88807 4 5 4.11193 5 4.25V5.75454C5 5.89261 4.88807 6.00454 4.75 6.00454H2.25C2.11193 6.00454 2 5.89261 2 5.75454V4.25ZM12.101 7.58421C12.101 9.02073 10.9365 10.1853 9.49998 10.1853C8.06346 10.1853 6.89893 9.02073 6.89893 7.58421C6.89893 6.14769 8.06346 4.98315 9.49998 4.98315C10.9365 4.98315 12.101 6.14769 12.101 7.58421ZM13.101 7.58421C13.101 9.57302 11.4888 11.1853 9.49998 11.1853C7.51117 11.1853 5.89893 9.57302 5.89893 7.58421C5.89893 5.5954 7.51117 3.98315 9.49998 3.98315C11.4888 3.98315 13.101 5.5954 13.101 7.58421Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
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
      <path
        d="M12 5v14m-7-7h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M16.9498 7.05023L12 12M12 12L7.05026 16.9497M12 12L7.05026 7.05023M12 12L16.9498 16.9497"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function CloseCircle(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M14.8284 9.17157L9.17157 14.8284M9.17157 9.17157L14.8284 14.8284M19.0711 19.0711C15.1658 22.9763 8.83418 22.9763 4.92893 19.0711C1.02369 15.1658 1.02369 8.83418 4.92893 4.92893C8.83418 1.02369 15.1658 1.02369 19.0711 4.92893C22.9763 8.83418 22.9763 15.1658 19.0711 19.0711Z"
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
      <path
        d="M12 6v6l4 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M13 2v7h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
        d="M8.5 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM15.5 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8.5 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM15.5 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
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
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M3 5.5C3 7.983 4.99169 9 7 9V12.5C7 12.7761 7.22386 13 7.5 13C7.77614 13 8 12.7761 8 12.5V9V3.1H9V12.5C9 12.7761 9.22386 13 9.5 13C9.77614 13 10 12.7761 10 12.5V3.1H11.5C11.8038 3.1 12.05 2.85376 12.05 2.55C12.05 2.24624 11.8038 2 11.5 2H9.5H8H7.5H7C4.99169 2 3 3.017 3 5.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
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

function BulletList(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M1.5 5.25C1.91421 5.25 2.25 4.91421 2.25 4.5C2.25 4.08579 1.91421 3.75 1.5 3.75C1.08579 3.75 0.75 4.08579 0.75 4.5C0.75 4.91421 1.08579 5.25 1.5 5.25ZM4 4.5C4 4.22386 4.22386 4 4.5 4H13.5C13.7761 4 14 4.22386 14 4.5C14 4.77614 13.7761 5 13.5 5H4.5C4.22386 5 4 4.77614 4 4.5ZM4.5 7C4.22386 7 4 7.22386 4 7.5C4 7.77614 4.22386 8 4.5 8H13.5C13.7761 8 14 7.77614 14 7.5C14 7.22386 13.7761 7 13.5 7H4.5ZM4.5 10C4.22386 10 4 10.2239 4 10.5C4 10.7761 4.22386 11 4.5 11H13.5C13.7761 11 14 10.7761 14 10.5C14 10.2239 13.7761 10 13.5 10H4.5ZM2.25 7.5C2.25 7.91421 1.91421 8.25 1.5 8.25C1.08579 8.25 0.75 7.91421 0.75 7.5C0.75 7.08579 1.08579 6.75 1.5 6.75C1.91421 6.75 2.25 7.08579 2.25 7.5ZM1.5 11.25C1.91421 11.25 2.25 10.9142 2.25 10.5C2.25 10.0858 1.91421 9.75 1.5 9.75C1.08579 9.75 0.75 10.0858 0.75 10.5C0.75 10.9142 1.08579 11.25 1.5 11.25Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function OrderedList(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      <path
        d="M4.5 8H3.5V5H2.5V4H4.5V8ZM4.5 17.5V17H2.5V16H5.5V20H2.5V19H4.5V18.5H3.5V17.5H4.5ZM2.5 11H4.3L2.5 13.1V14H5.5V13H3.7L5.5 10.9V10H2.5V11ZM7.5 7V5H21.5V7H7.5ZM7.5 19H21.5V17H7.5V19ZM21.5 13H7.5V11H21.5V13Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function List(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function OpenInNewWindow(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M12 13C12.5523 13 13 12.5523 13 12V3C13 2.44771 12.5523 2 12 2H3C2.44771 2 2 2.44771 2 3V6.5C2 6.77614 2.22386 7 2.5 7C2.77614 7 3 6.77614 3 6.5V3H12V12H8.5C8.22386 12 8 12.2239 8 12.5C8 12.7761 8.22386 13 8.5 13H12ZM9 6.5C9 6.5001 9 6.50021 9 6.50031V6.50035V9.5C9 9.77614 8.77614 10 8.5 10C8.22386 10 8 9.77614 8 9.5V7.70711L2.85355 12.8536C2.65829 13.0488 2.34171 13.0488 2.14645 12.8536C1.95118 12.6583 1.95118 12.3417 2.14645 12.1464L7.29289 7H5.5C5.22386 7 5 6.77614 5 6.5C5 6.22386 5.22386 6 5.5 6H8.5C8.56779 6 8.63244 6.01349 8.69139 6.03794C8.74949 6.06198 8.80398 6.09744 8.85143 6.14433C8.94251 6.23434 8.9992 6.35909 8.99999 6.49708L8.99999 6.49738"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      ></path>
    </Svg>
  )
}

function Star(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M6.97942 1.25171L6.9585 1.30199L5.58662 4.60039C5.54342 4.70426 5.44573 4.77523 5.3336 4.78422L1.7727 5.0697L1.71841 5.07405L1.38687 5.10063L1.08608 5.12475C0.820085 5.14607 0.712228 5.47802 0.914889 5.65162L1.14406 5.84793L1.39666 6.06431L1.43802 6.09974L4.15105 8.42374C4.23648 8.49692 4.2738 8.61176 4.24769 8.72118L3.41882 12.196L3.40618 12.249L3.32901 12.5725L3.25899 12.866C3.19708 13.1256 3.47945 13.3308 3.70718 13.1917L3.9647 13.0344L4.24854 12.861L4.29502 12.8326L7.34365 10.9705C7.43965 10.9119 7.5604 10.9119 7.6564 10.9705L10.705 12.8326L10.7515 12.861L11.0354 13.0344L11.2929 13.1917C11.5206 13.3308 11.803 13.1256 11.7411 12.866L11.671 12.5725L11.5939 12.249L11.5812 12.196L10.7524 8.72118C10.7263 8.61176 10.7636 8.49692 10.849 8.42374L13.562 6.09974L13.6034 6.06431L13.856 5.84793L14.0852 5.65162C14.2878 5.47802 14.18 5.14607 13.914 5.12475L13.6132 5.10063L13.2816 5.07405L13.2274 5.0697L9.66645 4.78422C9.55432 4.77523 9.45663 4.70426 9.41343 4.60039L8.04155 1.30199L8.02064 1.25171L7.89291 0.944609L7.77702 0.665992C7.67454 0.419604 7.32551 0.419604 7.22303 0.665992L7.10715 0.944609L6.97942 1.25171ZM7.50003 2.60397L6.50994 4.98442C6.32273 5.43453 5.89944 5.74207 5.41351 5.78103L2.84361 5.98705L4.8016 7.66428C5.17183 7.98142 5.33351 8.47903 5.2204 8.95321L4.62221 11.461L6.8224 10.1171C7.23842 9.86302 7.76164 9.86302 8.17766 10.1171L10.3778 11.461L9.77965 8.95321C9.66654 8.47903 9.82822 7.98142 10.1984 7.66428L12.1564 5.98705L9.58654 5.78103C9.10061 5.74207 8.67732 5.43453 8.49011 4.98442L7.50003 2.60397Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function CardStackPlus(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M2 3.5C2 3.22386 2.22386 3 2.5 3H12.5C12.7761 3 13 3.22386 13 3.5V9.5C13 9.77614 12.7761 10 12.5 10H2.5C2.22386 10 2 9.77614 2 9.5V3.5ZM2 10.9146C1.4174 10.7087 1 10.1531 1 9.5V3.5C1 2.67157 1.67157 2 2.5 2H12.5C13.3284 2 14 2.67157 14 3.5V9.5C14 10.1531 13.5826 10.7087 13 10.9146V11.5C13 12.3284 12.3284 13 11.5 13H3.5C2.67157 13 2 12.3284 2 11.5V10.9146ZM12 11V11.5C12 11.7761 11.7761 12 11.5 12H3.5C3.22386 12 3 11.7761 3 11.5V11H12ZM5 6.5C5 6.22386 5.22386 6 5.5 6H7V4.5C7 4.22386 7.22386 4 7.5 4C7.77614 4 8 4.22386 8 4.5V6H9.5C9.77614 6 10 6.22386 10 6.5C10 6.77614 9.77614 7 9.5 7H8V8.5C8 8.77614 7.77614 9 7.5 9C7.22386 9 7 8.77614 7 8.5V7H5.5C5.22386 7 5 6.77614 5 6.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function PencilAdd(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M12.1464 1.14645C12.3417 0.951184 12.6583 0.951184 12.8535 1.14645L14.8535 3.14645C15.0488 3.34171 15.0488 3.65829 14.8535 3.85355L10.9109 7.79618C10.8349 7.87218 10.7471 7.93543 10.651 7.9835L6.72359 9.94721C6.53109 10.0435 6.29861 10.0057 6.14643 9.85355C5.99425 9.70137 5.95652 9.46889 6.05277 9.27639L8.01648 5.34897C8.06455 5.25283 8.1278 5.16507 8.2038 5.08907L12.1464 1.14645ZM12.5 2.20711L8.91091 5.79618L7.87266 7.87267L8.12731 8.12732L10.2038 7.08907L13.7929 3.5L12.5 2.20711ZM9.99998 2L8.99998 3H4.9C4.47171 3 4.18056 3.00039 3.95552 3.01877C3.73631 3.03668 3.62421 3.06915 3.54601 3.10899C3.35785 3.20487 3.20487 3.35785 3.10899 3.54601C3.06915 3.62421 3.03669 3.73631 3.01878 3.95552C3.00039 4.18056 3 4.47171 3 4.9V11.1C3 11.5283 3.00039 11.8194 3.01878 12.0445C3.03669 12.2637 3.06915 12.3758 3.10899 12.454C3.20487 12.6422 3.35785 12.7951 3.54601 12.891C3.62421 12.9309 3.73631 12.9633 3.95552 12.9812C4.18056 12.9996 4.47171 13 4.9 13H11.1C11.5283 13 11.8194 12.9996 12.0445 12.9812C12.2637 12.9633 12.3758 12.9309 12.454 12.891C12.6422 12.7951 12.7951 12.6422 12.891 12.454C12.9309 12.3758 12.9633 12.2637 12.9812 12.0445C12.9996 11.8194 13 11.5283 13 11.1V6.99998L14 5.99998V11.1V11.1207C14 11.5231 14 11.8553 13.9779 12.1259C13.9549 12.407 13.9057 12.6653 13.782 12.908C13.5903 13.2843 13.2843 13.5903 12.908 13.782C12.6653 13.9057 12.407 13.9549 12.1259 13.9779C11.8553 14 11.5231 14 11.1207 14H11.1H4.9H4.87934C4.47686 14 4.14468 14 3.87409 13.9779C3.59304 13.9549 3.33469 13.9057 3.09202 13.782C2.7157 13.5903 2.40973 13.2843 2.21799 12.908C2.09434 12.6653 2.04506 12.407 2.0221 12.1259C1.99999 11.8553 1.99999 11.5231 2 11.1207V11.1206V11.1V4.9V4.87935V4.87932V4.87931C1.99999 4.47685 1.99999 4.14468 2.0221 3.87409C2.04506 3.59304 2.09434 3.33469 2.21799 3.09202C2.40973 2.71569 2.7157 2.40973 3.09202 2.21799C3.33469 2.09434 3.59304 2.04506 3.87409 2.0221C4.14468 1.99999 4.47685 1.99999 4.87932 2H4.87935H4.9H9.99998Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function Pencil(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42166 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42166 9.28547Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function Sidenav(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 32 32" {...props}>
      <circle r="1" transform="matrix(1 0 0 -1 24 16)" fill="currentColor" />
      <circle r="1" transform="matrix(1 0 0 -1 24 13)" fill="currentColor" />
      <circle r="1" transform="matrix(1 0 0 -1 24 10)" fill="currentColor" />
      <path
        d="M20.5 25.5L20.5 6.5M5 26L27 26C27.5523 26 28 25.5523 28 25L28 7C28 6.44772 27.5523 6 27 6L5 6C4.44772 6 4 6.44772 4 7L4 25C4 25.5523 4.44772 26 5 26Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Sidepanel(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={32} height={32} viewBox="0 0 15 15" {...props}>
      <circle
        r={1}
        transform="matrix(-1 0 0 1 24.348 11.146)"
        fill="currentColor"
      />
      <circle
        r={1}
        transform="matrix(-1 0 0 1 24.348 14.146)"
        fill="currentColor"
      />
      <circle
        r={1}
        transform="matrix(-1 0 0 1 24.348 17.146)"
        fill="currentColor"
      />
      <path
        d="M20.348 6.146v19M27 6H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function Reload(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M1.903 7.297c0 3.044 2.207 5.118 4.686 5.547a.521.521 0 1 1-.178 1.027C3.5 13.367.861 10.913.861 7.297c0-1.537.699-2.745 1.515-3.663.585-.658 1.254-1.193 1.792-1.602H2.532a.5.5 0 0 1 0-1h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V2.686l-.001.002c-.572.43-1.27.957-1.875 1.638-.715.804-1.253 1.776-1.253 2.97Zm11.108.406c0-3.012-2.16-5.073-4.607-5.533a.521.521 0 1 1 .192-1.024c2.874.54 5.457 2.98 5.457 6.557 0 1.537-.699 2.744-1.515 3.663-.585.658-1.254 1.193-1.792 1.602h1.636a.5.5 0 1 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 1 1 1 0v1.845h.002c.571-.432 1.27-.958 1.874-1.64.715-.803 1.253-1.775 1.253-2.97Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function Person(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" {...props}>
      <path
        d="M7.5 0.875C5.49797 0.875 3.875 2.49797 3.875 4.5C3.875 6.15288 4.98124 7.54738 6.49373 7.98351C5.2997 8.12901 4.27557 8.55134 3.50407 9.31167C2.52216 10.2794 2.02502 11.72 2.02502 13.5999C2.02502 13.8623 2.23769 14.0749 2.50002 14.0749C2.76236 14.0749 2.97502 13.8623 2.97502 13.5999C2.97502 11.8799 3.42786 10.7206 4.17091 9.9883C4.91536 9.25463 6.02674 8.87499 7.49995 8.87499C8.97317 8.87499 10.0846 9.25463 10.8291 9.98831C11.5721 10.7206 12.025 11.8799 12.025 13.5999C12.025 13.8623 12.2376 14.0749 12.5 14.0749C12.7623 14.075 12.975 13.8623 12.975 13.6C12.975 11.72 12.4778 10.2794 11.4959 9.31166C10.7244 8.55135 9.70025 8.12903 8.50625 7.98352C10.0187 7.5474 11.125 6.15289 11.125 4.5C11.125 2.49797 9.50203 0.875 7.5 0.875ZM4.825 4.5C4.825 3.02264 6.02264 1.825 7.5 1.825C8.97736 1.825 10.175 3.02264 10.175 4.5C10.175 5.97736 8.97736 7.175 7.5 7.175C6.02264 7.175 4.825 5.97736 4.825 4.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function Image(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" fill="none" {...props}>
      <path
        d="M2.5 1H12.5C13.3284 1 14 1.67157 14 2.5V12.5C14 13.3284 13.3284 14 12.5 14H2.5C1.67157 14 1 13.3284 1 12.5V2.5C1 1.67157 1.67157 1 2.5 1ZM2.5 2C2.22386 2 2 2.22386 2 2.5V8.3636L3.6818 6.6818C3.76809 6.59551 3.88572 6.54797 4.00774 6.55007C4.12975 6.55216 4.24568 6.60372 4.32895 6.69293L7.87355 10.4901L10.6818 7.6818C10.8575 7.50607 11.1425 7.50607 11.3182 7.6818L13 9.3636V2.5C13 2.22386 12.7761 2 12.5 2H2.5ZM2 12.5V9.6364L3.98887 7.64753L7.5311 11.4421L8.94113 13H2.5C2.22386 13 2 12.7761 2 12.5ZM12.5 13H10.155L8.48336 11.153L11 8.6364L13 10.6364V12.5C13 12.7761 12.7761 13 12.5 13ZM6.64922 5.5C6.64922 5.03013 7.03013 4.64922 7.5 4.64922C7.96987 4.64922 8.35078 5.03013 8.35078 5.5C8.35078 5.96987 7.96987 6.35078 7.5 6.35078C7.03013 6.35078 6.64922 5.96987 6.64922 5.5ZM7.5 3.74922C6.53307 3.74922 5.74922 4.53307 5.74922 5.5C5.74922 6.46693 6.53307 7.25078 7.5 7.25078C8.46693 7.25078 9.25078 6.46693 9.25078 5.5C9.25078 4.53307 8.46693 3.74922 7.5 3.74922Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function Video(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" fill="none" {...props}>
      <path
        d="M4.76447 3.12199C5.63151 3.04859 6.56082 3 7.5 3C8.43918 3 9.36849 3.04859 10.2355 3.12199C11.2796 3.21037 11.9553 3.27008 12.472 3.39203C12.9425 3.50304 13.2048 3.64976 13.4306 3.88086C13.4553 3.90618 13.4902 3.94414 13.5133 3.97092C13.7126 4.20149 13.8435 4.4887 13.918 5.03283C13.9978 5.6156 14 6.37644 14 7.52493C14 8.66026 13.9978 9.41019 13.9181 9.98538C13.8439 10.5206 13.7137 10.8061 13.5125 11.0387C13.4896 11.0651 13.4541 11.1038 13.4296 11.1287C13.2009 11.3625 12.9406 11.5076 12.4818 11.6164C11.9752 11.7365 11.3143 11.7942 10.2878 11.8797C9.41948 11.9521 8.47566 12 7.5 12C6.52434 12 5.58052 11.9521 4.7122 11.8797C3.68572 11.7942 3.02477 11.7365 2.51816 11.6164C2.05936 11.5076 1.7991 11.3625 1.57037 11.1287C1.54593 11.1038 1.51035 11.0651 1.48748 11.0387C1.28628 10.8061 1.15612 10.5206 1.08193 9.98538C1.00221 9.41019 1 8.66026 1 7.52493C1 6.37644 1.00216 5.6156 1.082 5.03283C1.15654 4.4887 1.28744 4.20149 1.48666 3.97092C1.5098 3.94414 1.54468 3.90618 1.56942 3.88086C1.7952 3.64976 2.05752 3.50304 2.52796 3.39203C3.04473 3.27008 3.7204 3.21037 4.76447 3.12199ZM0 7.52493C0 5.28296 0 4.16198 0.729985 3.31713C0.766457 3.27491 0.815139 3.22194 0.854123 3.18204C1.63439 2.38339 2.64963 2.29744 4.68012 2.12555C5.56923 2.05028 6.52724 2 7.5 2C8.47276 2 9.43077 2.05028 10.3199 2.12555C12.3504 2.29744 13.3656 2.38339 14.1459 3.18204C14.1849 3.22194 14.2335 3.27491 14.27 3.31713C15 4.16198 15 5.28296 15 7.52493C15 9.74012 15 10.8477 14.2688 11.6929C14.2326 11.7348 14.1832 11.7885 14.1444 11.8281C13.3629 12.6269 12.3655 12.71 10.3709 12.8763C9.47971 12.9505 8.50782 13 7.5 13C6.49218 13 5.52028 12.9505 4.62915 12.8763C2.63446 12.71 1.63712 12.6269 0.855558 11.8281C0.816844 11.7885 0.767442 11.7348 0.731221 11.6929C0 10.8477 0 9.74012 0 7.52493ZM5.25 5.38264C5.25 5.20225 5.43522 5.08124 5.60041 5.15369L10.428 7.27105C10.6274 7.35853 10.6274 7.64147 10.428 7.72895L5.60041 9.84631C5.43522 9.91876 5.25 9.79775 5.25 9.61736V5.38264Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function Code(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" fill="none" {...props}>
      <path
        d="M9.96424 2.68571C10.0668 2.42931 9.94209 2.13833 9.6857 2.03577C9.4293 1.93322 9.13832 2.05792 9.03576 2.31432L5.03576 12.3143C4.9332 12.5707 5.05791 12.8617 5.3143 12.9642C5.5707 13.0668 5.86168 12.9421 5.96424 12.6857L9.96424 2.68571ZM3.85355 5.14646C4.04882 5.34172 4.04882 5.6583 3.85355 5.85356L2.20711 7.50001L3.85355 9.14646C4.04882 9.34172 4.04882 9.6583 3.85355 9.85356C3.65829 10.0488 3.34171 10.0488 3.14645 9.85356L1.14645 7.85356C0.951184 7.6583 0.951184 7.34172 1.14645 7.14646L3.14645 5.14646C3.34171 4.9512 3.65829 4.9512 3.85355 5.14646ZM11.1464 5.14646C11.3417 4.9512 11.6583 4.9512 11.8536 5.14646L13.8536 7.14646C14.0488 7.34172 14.0488 7.6583 13.8536 7.85356L11.8536 9.85356C11.6583 10.0488 11.3417 10.0488 11.1464 9.85356C10.9512 9.6583 10.9512 9.34172 11.1464 9.14646L12.7929 7.50001L11.1464 5.85356C10.9512 5.6583 10.9512 5.34172 11.1464 5.14646Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  )
}

function Search(props: Stitches.VariantProps<typeof Svg>) {
  return (
    <Svg width={24} height={24} viewBox="0 0 15 15" fill="none" {...props}>
      <path
        d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      ></path>
    </Svg>
  )
}
