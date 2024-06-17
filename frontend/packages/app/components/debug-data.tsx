import {Button, SizableText, XStack, YStack} from '@shm/ui'
import {useState} from 'react'
import {useHasDevTools} from '../models/experiments'

export function DebugData({data}: {data: any}) {
  const hasDevTools = useHasDevTools()
  const [debugValue, setDebugValue] = useState(false)
  if (!hasDevTools) return null
  return (
    <YStack maxWidth="500px" marginHorizontal="auto" marginVertical="200px">
      <Button
        size="$1"
        theme="gray"
        width="100%"
        onPress={() => setDebugValue((v) => !v)}
      >
        toggle value
      </Button>
      {debugValue && (
        <XStack
          tag="pre"
          {...{
            whiteSpace: 'wrap',
          }}
        >
          <SizableText tag="code" size="$1">
            {JSON.stringify(data, null, 3)}
          </SizableText>
        </XStack>
      )}
    </YStack>
  )
}
