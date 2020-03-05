import Link from 'next/link'

interface ButtonProps extends React.HTMLAttributes<any> {
  children: string
  href: string
}

export default function Button({children, href, className}: ButtonProps) {
  return (
    <Link href={href}>
      <a className={`text-center text-white ${className}`}>{children}</a>
    </Link>
  )
}
