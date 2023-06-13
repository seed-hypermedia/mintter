import {SizableText, XStack} from '@mintter/ui'

export function DebugData({data}: {data: any}) {
  return (
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
  )
}
