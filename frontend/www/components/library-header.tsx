import Logo from './logo_square'
import Link from 'next/link'
import Input from './input'

export default function LibraryHeader() {
  return (
    <div className="flex items-center m-8">
      <div className="text-primary">
        <Link href="/drafts">
          <a>
            <Logo width="50px" className="fill-current" />
          </a>
        </Link>
      </div>
      <div className="flex-1" />
      <div className="w-full max-w-3xl pl-8">
        <Input name="hash-search" type="text" placeholder="hash ID" />
      </div>
    </div>
  )
}
