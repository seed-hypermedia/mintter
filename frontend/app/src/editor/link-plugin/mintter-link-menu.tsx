import { Box } from '@mintter/ui/box';
import * as Portal from '@radix-ui/react-portal';
import { createContext, useContext } from 'react';
import { Button } from '@mintter/ui/button';

export const MintterLinkMenuContext = createContext({
  open: false,
  coords: { x: 0, y: 0 },
  show: (coords: { x: number, y: number }) => { },
  hide: () => { },
})

export function MintterLinkMenu() {
  const { open, coords, hide } = useContext(MintterLinkMenuContext)

  return (
    <Portal.Root>
      <Box
        css={{
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'content-box',
          alignItems: 'start',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          background: '$background-muted',
          borderRadius: '$2',
          boxShadow: '$3',
          padding: '$1',
          visibility: open ? 'visible' : 'hidden',
          position: 'absolute',
          top: `${coords.y}px`,
          left: `${coords.x}px`
        }}
      >
        <Button onClick={hide} variant="ghost" color="muted">
          Dismiss
        </Button>
        <Button onClick={() => {
          console.log('create bookmark')
          hide()
        }} variant="ghost" color="muted">
          Create Document Bookmark
        </Button>
      </Box>
    </Portal.Root>
  )
}