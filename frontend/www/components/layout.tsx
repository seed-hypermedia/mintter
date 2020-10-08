import {useTheme} from 'shared/themeContext'

export interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  initial?: string
  animate?: string
  exit?: string
}

export default function Layout({
  children,
  className = '',
  initial = 'exit',
  animate = 'enter',
  exit = 'exit',
}: LayoutProps) {
  const {theme} = useTheme()
  return (
    <div
      className={`fixed w-screen h-screen flex bg-background content-transition ${theme} ${className}`}
    >
      {children}
    </div>
  )
}
