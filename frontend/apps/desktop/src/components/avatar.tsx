import {useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
import '../styles/avatar.scss'

export function Avatar({
  url,
  accountId,
  alias,
  size = 2,
  color,
}: {
  url?: string
  accountId?: string
  alias: string
  size: 1 | 2 | 3
  color?: string
}) {
  let {data: avatarColor} = useQuery({
    queryKey: ['avatarColor', accountId],
    queryFn: () => getRandomColor(accountId!),
    enabled: !!accountId,
    retry: false,
    staleTime: Infinity,
  })
  let initials = useMemo(() => alias[0], [alias])
  return (
    <div
      className="avatar-circle"
      style={{backgroundColor: color || avatarColor}}
      data-size={size}
    >
      {url ? <img src={url} /> : <span className="initials">{initials}</span>}
    </div>
  )
}

export function getRandomColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 6) - hash)
    hash = hash & hash // Convert to 32bit integer
  }
  const shortened = hash % 360
  return `hsl(${shortened},60%,80%)`
}
