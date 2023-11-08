import {Button, Tooltip} from '@mintter/ui'
import {Pin, PinOff} from '@tamagui/lucide-icons'
import {
  useToggleAccountPin,
  useToggleDocumentPin,
  useToggleGroupPin,
} from '../models/pins'
import {PublicationRoute} from '../utils/navigation'
import {useState} from 'react'

export function PinAccountButton({accountId}: {accountId: string}) {
  const {isPinned, togglePin} = useToggleAccountPin(accountId)
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

function UnpinButton({onPress}: {onPress: () => void}) {
  const [isHovering, setIsHovering] = useState(false)
  return (
    <Tooltip content="Unpin from Sidebar">
      <Button
        icon={isHovering ? PinOff : Pin}
        size="$2"
        theme={isHovering ? 'red' : undefined}
        onPress={onPress}
        chromeless
        onHoverIn={() => setIsHovering(true)}
        onHoverOut={() => setIsHovering(false)}
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
  const {isPinned, togglePin} = useToggleGroupPin(groupId)
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
  const {isPinned, togglePin} = useToggleDocumentPin(route)
  if (isPinned) {
    return <UnpinButton onPress={togglePin} />
  }
  return <PinButton onPress={togglePin} />
}
