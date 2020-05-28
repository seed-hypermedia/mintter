import {useEffect, useState} from 'react'
import Logo from './logo_square'
import Link from 'next/link'
import Input from './input'
import {GetProfileAddrsRequest} from '@mintter/proto/mintter_pb'
import {makeRpcClient} from '../shared/rpc'
const rpc = makeRpcClient()

export default function LibraryHeader() {
  const [addrs, setAddrs] = useState<string[]>(null)

  useEffect(() => {
    async function init() {
      const req = new GetProfileAddrsRequest()
      const res = await rpc.getProfileAddrs(req)

      console.log('res => ', res.toObject())
      setAddrs(res.toObject().addrsList)
    }

    init()
  }, [])

  function showAddresses() {
    console.log('addressessss')
    alert(`
    your addresses are:

    ${addrs.map(a => `${a}\n\n`)}`)
  }

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
      <button
        onClick={showAddresses}
        className=" text-white text-sm py-1 px-2 rounded rounded-full flex items-center justify-center"
      >
        show addresses
      </button>
      <div className="w-full max-w-3xl pl-8">
        <Input name="hash-search" type="text" placeholder="hash ID" />
      </div>
    </div>
  )
}
