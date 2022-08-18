import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {ScrollArea, ScrollAreaProps} from '@components/scroll-area'
import {Text} from '@components/text'
import {PropsWithChildren} from 'react'
import {FallbackProps} from 'react-error-boundary'

export var rootPageStyle = css({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  inlineSize: '100%',
  blockSize: '100%',
  display: 'grid',
  overflow: 'hidden',
  gridAutoFlow: 'column',
  gridTemplateRows: '40px 1fr',
  gridTemplateColumns: '1fr auto',
  gap: 0,
  gridTemplateAreas: `"topbar topbar"
  "main library"`,
  background: '$base-background-normal',

  '& [data-layout-section="topbar"]': {
    gridArea: 'topbar',
  },
  '& [data-layout-section="main"]': {
    gridArea: 'main',
  },
  '& [data-layout-section="library"]': {
    gridArea: 'library',
  },
})

let mainWindowStyle = css({
  height: '$full',
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: '$base-background-subtle',
  paddingBottom: 0,
})

export function MainWindow({children, orientation, onScroll}: ScrollAreaProps) {
  return (
    <Box data-layout-section="main" className={mainWindowStyle()}>
      <ScrollArea orientation={orientation} onScroll={onScroll}>
        {children}
      </ScrollArea>
    </Box>
  )
}

export function MainWindowShell({
  children,
  ...props
}: PropsWithChildren<unknown>) {
  return (
    <Box data-layout-section="main" {...props} className={mainWindowStyle()}>
      {children}
    </Box>
  )
}
export function MainPageShell(props: PropsWithChildren<unknown>) {
  return <Box {...props} className={rootPageStyle()} />
}

export function Placeholder() {
  return (
    <Box
      data-layout-section="main"
      aria-hidden
      css={{
        width: '$full',
        height: '$full',
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <Text
        alt
        fontWeight="bold"
        css={{
          // userSelect: 'none',
          fontSize: 100,
          opacity: 0.5,
          color: 'transparent',
          textShadow: '2px 2px 3px rgba(255,255,255,0.5)',
          backgroundClip: 'text',
          backgroundColor: '$base-component-bg-active',
        }}
      >
        Mintter
      </Text>
    </Box>
  )
}

export function PageError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <div role="alert" data-layout-section="main">
      <p>Publication Error</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>reload page</button>
    </div>
  )
}
