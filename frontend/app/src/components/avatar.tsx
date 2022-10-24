import {useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
import '../styles/avatar.scss'

export function Avatar({
  accountId,
  alias,
  size = 2,
}: {
  accountId?: string
  alias: string
  size: 1 | 2 | 3
}) {
  let {data: color} = useQuery({
    queryKey: ['avatarColor', accountId],
    queryFn: () => getRandomColor(accountId),
    enabled: !!accountId,
    retry: false,
    staleTime: Infinity,
  })
  let initials = useMemo(() => alias[0], [alias])
  return (
    <div
      className="avatar-circle"
      style={{backgroundColor: color}}
      data-size={size}
    >
      <span className="initials">{initials}</span>
    </div>
  )
}

function getRandomColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 6) - hash)
    hash = hash & hash // Convert to 32bit integer
  }
  const shortened = hash % 360
  return `hsl(${shortened},60%,80%)`
}
