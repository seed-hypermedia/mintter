import {useMemo} from 'react'
import '../styles/avatar.scss'

export function Avatar({alias, size = 2}: {alias: string; size: 1 | 2 | 3}) {
  let initials = useMemo(() => alias[0], [alias])
  return (
    <div className="avatar-circle" data-size={size}>
      <span className="initials">{initials}</span>
    </div>
  )
}
