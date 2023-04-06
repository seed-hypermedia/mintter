import {Button, Text, Stack} from '@mintter/ui'

export function EmptyList({
  description,
  action,
}: {
  description: string
  action: () => void
}) {
  return (
    <Stack>
      <Text fontSize={'1.5em'}>{description}</Text>
      <Button onPress={() => action()}>Start a new Draft</Button>
    </Stack>
  )
}
