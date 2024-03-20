import {PublicationVariant, useHover} from '@mintter/shared'
import {Button, ButtonProps, Tooltip} from '@mintter/ui'
import {Pin, PinOff} from '@tamagui/lucide-icons'
import {usePinAccount, usePinDocument, usePinGroup} from '../models/pins'

export function PinAccountButton({accountId}: {accountId: string}) {
  const {isPinned, togglePin} = usePinAccount(accountId)
  if (isPinned) {
    return <UnpinButton onPress={togglePin} />
  }
  return (
    <Tooltip content="Pin to Sidebar">
      <Button icon={Pin} size="$2" onPress={togglePin} />
    </Tooltip>
  )
}

export function UnpinButton({
  onPress,
  chromeless,
}: {
  onPress: ButtonProps['onPress']
  chromeless?: boolean
}) {
  const {hover, ...hoverProps} = useHover()
  return (
    <Tooltip content="Unpin from Sidebar">
      <Button
        icon={hover ? PinOff : Pin}
        size="$2"
        theme={hover ? 'red' : undefined}
        onPress={(e) => {
          e.stopPropagation()
          onPress?.(e)
        }}
        chromeless
        bg={chromeless ? '$colorTransparent' : '$color4'}
        {...hoverProps}
      />
    </Tooltip>
  )
}

function PinButton({
  onPress,
  chromeless,
}: {
  onPress: () => void
  chromeless?: boolean
}) {
  return (
    <Tooltip content="Pin to Sidebar">
      <Button
        icon={Pin}
        size="$2"
        onPress={onPress}
        chromeless
        bg={chromeless ? '$colorTransparent' : '$color4'}
      />
    </Tooltip>
  )
}

export function PinGroupButton({groupId}: {groupId: string}) {
  const {isPinned, togglePin} = usePinGroup(groupId)
  if (isPinned) {
    return <UnpinButton onPress={togglePin} />
  }
  return (
    <Button
      icon={Pin}
      size="$2"
      onPress={(e) => {
        e.stopPropagation()
        togglePin()
      }}
    />
  )
}

export function PinDocumentButton({
  docId,
  variants,
}: {
  docId: string
  variants: PublicationVariant[]
}) {
  const {isPinned, togglePin} = usePinDocument(docId, variants)
  if (isPinned) {
    return <UnpinButton onPress={togglePin} />
  }
  return <PinButton onPress={togglePin} />
}
