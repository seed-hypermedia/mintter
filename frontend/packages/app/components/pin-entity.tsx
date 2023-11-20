import {Button, Tooltip, useHover} from '@mintter/ui'
import {Pin, PinOff} from '@tamagui/lucide-icons'
import {usePinAccount, usePinDocument, usePinGroup} from '../models/pins'
import {PublicationRoute} from '../utils/navigation'

export function PinAccountButton({accountId}: {accountId: string}) {
  const {isPinned, togglePin} = usePinAccount(accountId)
  if (isPinned) {
    return <UnpinButton onPress={togglePin} />
  }
  return (
    <Tooltip content="Pin to Sidebar">
      <Button
        icon={Pin}
        size="$2"
        onPress={() => {
          togglePin()
        }}
      />
    </Tooltip>
  )
}

function UnpinButton({onPress}: {onPress: () => void}) {
  const {hover, ...hoverProps} = useHover()
  return (
    <Tooltip content="Unpin from Sidebar">
      <Button
        icon={hover ? PinOff : Pin}
        size="$2"
        theme={hover ? 'red' : undefined}
        onPress={onPress}
        chromeless
        {...hoverProps}
      />
    </Tooltip>
  )
}

function PinButton({onPress}: {onPress: () => void}) {
  return (
    <Tooltip content="Pin to Sidebar">
      <Button icon={Pin} size="$2" onPress={onPress} chromeless />
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
      onPress={() => {
        togglePin()
      }}
    />
  )
}

export function PinDocumentButton({route}: {route: PublicationRoute}) {
  const {isPinned, togglePin} = usePinDocument(route)
  if (isPinned) {
    return <UnpinButton onPress={togglePin} />
  }
  return <PinButton onPress={togglePin} />
}
