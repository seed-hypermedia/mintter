import {Button, Text, YStack} from '@mintter/ui'
import {Icon} from './icon'

export function EmptyList({
  description,
  action,
}: {
  description: string
  action: () => void
}) {
  return (
    <YStack gap="$5" paddingVertical="$8">
      <Text fontFamily="$body" fontSize="$3">
        {description}
      </Text>
      <Button size="$4" onPress={() => action()} alignSelf="flex-start">
        <Icon name="PencilAdd" color="primary" />
        Start a new Draft
      </Button>
    </YStack>
  )
}
