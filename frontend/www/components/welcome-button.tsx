import Link, {LinkProps} from 'next/link'

export default function WelcomeButton({
  children,
  href,
}: LinkProps & {children: string}) {
  return (
    <Link href={href}>
      <a className="bg-blue-500 hover:bg-blue-400 text-white font-bold rounded box-border block px-5 py-4 m-5">
        {children}
      </a>
    </Link>
  )
}
