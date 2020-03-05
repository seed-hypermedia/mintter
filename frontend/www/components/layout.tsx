import {motion} from 'framer-motion'

interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
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
      className={`absolute w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  )
}
