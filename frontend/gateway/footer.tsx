import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="text-gray-700 w-full flex justify-between items-center pt-24 text-sm">
      <Link className="px-2" href="/">
        Home
      </Link>
    </footer>
  )
}
