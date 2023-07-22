import {useEffect, useState} from 'react'
import {useGRPCClient} from '@mintter/app'
import {toast, Toaster} from 'react-hot-toast'
import {Button} from '@mintter/ui'

export function App() {
  const [count, setCount] = useState(0)
  const client = useGRPCClient()
  useEffect(() => {
    client.daemon.getInfo({}).then((data) => {
      console.log('data', data)
      toast.success('lol')
    })
  }, [])
  return (
    <>
      <h1>Mintter</h1>
      <Button
        onPress={() => {
          toast.success('lol')
        }}
      >
        HHello
      </Button>
      <Toaster position="bottom-right" toastOptions={{className: 'toaster'}} />
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/app.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}
