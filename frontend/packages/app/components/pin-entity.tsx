import {Button} from '@mintter/ui'
import {Pin, PinOff} from '@tamagui/lucide-icons'
import {
  useToggleAccountPin,
  useToggleDocumentPin,
  useToggleGroupPin,
} from '../models/pins'
import {PublicationRoute} from '../utils/navigation'

export function PinAccountButton({accountId}: {accountId: string}) {
  const {isPinned, togglePin} = useToggleAccountPin(accountId)
  if (isPinned) {
    return (
      <Button
        icon={PinOff}
        size="$2"
        onPress={() => {
          togglePin()
        }}
      />
    )
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

export function PinGroupButton({groupId}: {groupId: string}) {
  const {isPinned, togglePin} = useToggleGroupPin(groupId)
  if (isPinned) {
    return (
      <Button
        icon={PinOff}
        size="$2"
        onPress={() => {
          togglePin()
        }}
      />
    )
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
    return (
      <Button
        icon={PinOff}
        size="$2"
        onPress={() => {
          togglePin()
        }}
      />
    )
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
