import {ReactNode} from 'react'
import {Box} from './box'
import {ScrollArea} from './scroll-area'

export default function PageContainer({children}: {children: ReactNode}) {
  return (
    <ScrollArea>
      <Box
        css={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 800,
          marginTop: '2em',
          marginInline: 'auto',
          boxSizing: 'border-box',
          marginBottom: 100,
        }}
      >
        {children}
      </Box>
    </ScrollArea>
  )
}
