import {Box} from '@mintter/ui/box'
import {PropsWithChildren} from 'react'

export type PageLayoutProps = PropsWithChildren<{
  isSidepanelOpen: boolean
}>

export function PageLayout({isSidepanelOpen = false, children, ...props}: PageLayoutProps) {
  return (
    <Box
      css={{
        display: 'grid',
        minHeight: '$full',
        gridTemplateAreas: isSidepanelOpen
          ? `"controls controls"
    "maincontent rightside"`
          : `"controls"
    "maincontent"`,
        gridTemplateColumns: isSidepanelOpen ? '1fr minmax(350px, 40%)' : '1fr',
        gridTemplateRows: '64px 1fr',
      }}
    >
      {children}
    </Box>
  )
}
