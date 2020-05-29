import {useEffect} from 'react'
import {useRouter} from 'next/router'

export default function LibraryIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace({
      pathname: `/library/publications`,
    })
  }, [])
  return null
}
