import {motion} from 'framer-motion'

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
  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      className={`absolute w-screen h-screen flex ${className}`}
    >
      {children}
    </motion.div>
  )
}
