import {useHistory} from 'react-router-dom'
import {useEffect} from 'react'

export interface RedirectProps {
  to: string
}

export function Redirect({to}: RedirectProps) {
  const history = useHistory()

  useEffect(() => {
    history.push(to)
  }, [])
  return null
}
