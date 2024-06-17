import {Button, Tooltip} from '@shm/ui'

import {useHover} from '@shm/shared'
import {CheckCircle, PlusCircle, XCircle} from '@tamagui/lucide-icons'
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
  const {hover, ...hoverProps} = useHover()
  const setTrusted = useSetTrusted()
  let label = !isTrusted
    ? 'Trust Account'
    : hover
    ? 'Untrust Account'
    : 'Trusted Account'

  if (!isTrusted) {
    return (
      <Tooltip content={label}>
        <Button
          size="$2"
          theme="green"
          backgroundColor={isTrusted ? '$background' : '$backgroundTransparent'}
          borderColor="$borderColor"
          icon={PlusCircle}
          onPress={(e) => {
            e.stopPropagation()
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
        theme={hover ? 'red' : 'green'}
        icon={hover ? XCircle : CheckCircle}
        borderColor="$borderColor"
        onPress={(e) => {
          e.stopPropagation()
          setTrusted.mutate({accountId, isTrusted: false})
        }}
        {...hoverProps}
      >
        {!iconOnly ? label : null}
      </Button>
    </Tooltip>
  )
}
