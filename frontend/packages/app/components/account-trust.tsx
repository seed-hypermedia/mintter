import {Button, Tooltip} from '@mintter/ui'

import {CheckCircle, PlusCircle, XCircle} from '@tamagui/lucide-icons'
import {useState} from 'react'
import {useSetTrusted} from '../models/accounts'

export function AccountTrustButton({
  accountId,
  isTrusted,
  iconOnly = false,
}: {
  accountId: string
  isTrusted?: boolean
  iconOnly?: boolean
}) {
  const [hovering, setHovering] = useState(false)
  const setTrusted = useSetTrusted()
  let label = !isTrusted
    ? 'Trust Account'
    : hovering
    ? 'Untrust Account'
    : 'Trusted Account'
  if (!isTrusted) {
    return (
      <Tooltip content={label}>
        <Button
          size="$2"
          icon={PlusCircle}
          onPress={() => {
            setTrusted.mutate({accountId, isTrusted: true})
          }}
        >
          {!iconOnly ? label : undefined}
        </Button>
      </Tooltip>
    )
  }
  return (
    <Tooltip content={label}>
      <Button
        size="$2"
        theme={hovering ? 'red' : 'green'}
        icon={hovering ? XCircle : CheckCircle}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onPress={() => {
          setTrusted.mutate({accountId, isTrusted: false})
        }}
      >
        {!iconOnly ? label : null}
      </Button>
    </Tooltip>
  )
}
