import {useRouter} from 'next/router'
import {useEffect} from 'react'

export interface RedirectProps {
  to: string
}

export function Redirect({to}: RedirectProps) {
  const router = useRouter()

  useEffect(() => {
    router.push(to)
  }, [])
  return null
}
