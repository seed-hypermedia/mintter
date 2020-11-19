import React from 'react'
import {css} from 'emotion'
import {useTheme} from 'shared/themeContext'

export interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  initial?: string
  animate?: string
  exit?: string
}

export default function Layout({children, className = ''}: LayoutProps) {
  const {theme} = useTheme()
  return (
    <div
      className={`fixed w-screen h-screen flex content-transition ${theme} ${className}`}
    >
      {children}
    </div>
  )
}

export function AppLayout({children}) {
  const {theme} = useTheme()
  return (
    <div
      className={`w-screen h-screen grid grid-flow-row overflow-hidden ${css`
        grid-template-rows: auto 1fr;
      `} ${theme}`}
    >
      {children}
    </div>
  )
}
