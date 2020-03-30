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
  const {theme, toggleTheme} = useTheme()
  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      className={`absolute w-screen h-screen flex bg-background content-transition ${theme} ${className}`}
    >
      <div className="absolute right-0 top-0 p-4">
        <ThemeToggle isDark={theme === 'theme-dark'} toggle={toggleTheme} />
      </div>
      {children}
    </motion.div>
  )
}
