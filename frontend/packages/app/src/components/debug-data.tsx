import {Button, SizableText, XStack, YStack} from '@mintter/ui'
import {useState} from 'react'

export function DevDebugData({data}: {data: any}) {
  const [debugValue, setDebugValue] = useState(false)
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

const isDev = import.meta.env.DEV
export const DebugData = isDev ? DevDebugData : () => null
