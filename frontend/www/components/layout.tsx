import {motion} from 'framer-motion'
import {useTheme} from '../shared/themeContext'
// import {useProfile} from '../shared/profileContext'
import ThemeToggle from './themeToggle'

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
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      className={`fixed overflow-y-scroll w-screen h-screen flex bg-background content-transition ${theme} ${className}`}
    >
      {children}
    </motion.div>
  )
}
