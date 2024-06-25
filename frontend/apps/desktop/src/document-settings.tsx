import { SizableText, XStack, YStack } from '@shm/ui'
import { useEffect, useState } from 'react'
import { useEntityTimeline } from './models/changes'
import { useNavRoute } from './utils/navigation'

export function DocumentSettings({ open = true }: { open: boolean }) {
  const route = useNavRoute()

  const timeline = useEntityTimeline(route.documentId)
  console.log(`== ~ DocumentSettings ~ route:`, route)
  console.log(`== ~ DocumentSettings ~ timeline:`, timeline)
  const [sourceIndex, setSourceIndex] = useState<number[]>([])
  const [targetIndex, setTargetIndex] = useState<number[]>([])
  console.log('INDEXES', { sourceIndex, targetIndex })
  useEffect(() => {
    if (timeline.data?.changesByTime.length) {
      let sv = route.sourceVersion.split('.').map((v) => {
        console.log('VAL', v)
        return timeline.data?.changesByTime.findIndex((av) => av == v)
      })
      let tv = route.targetVersion.split('.').map((v) => {
        console.log('VAL', v)
        return timeline.data?.changesByTime.findIndex((av) => av == v)
      })

      console.log('data', sv, tv)
      setSourceIndex(sv)
      setTargetIndex(tv)
    }
  }, [timeline.data, route.sourceVersion, route.targetVersion])

  return (
    <YStack width={270} borderLeftWidth={1} borderColor="$color7">
      <XStack
        paddingVertical="$3"
        paddingHorizontal="$4"
        borderBottomWidth={1}
        borderColor="$color7"
      >
        <SizableText size="$3" fontWeight="600">
          Changes
        </SizableText>
      </XStack>
      <YStack>
        <SizableText>
          {route.sourceVersion.substring(route.sourceVersion.length - 9)}
        </SizableText>
        <SizableText>
          {route.targetVersion.substring(route.targetVersion.length - 9)}
        </SizableText>
        <SizableText>{timeline.data?.heads}</SizableText>

        {timeline?.data?.changesByTime.map((c) => (
          <SizableText
          // color={
          //   [route.sourceVersion.split('.'), route.targetVersion.split('.')]
          //     .flat()
          //     .includes(c)
          //     ? 'red'
          //     : '400'
          // }
          >
            {JSON.stringify(c.substring(c.length - 9), null, 2)}
          </SizableText>
        ))}
      </YStack>
    </YStack>
  )
}

function isVersionConcat(version: string): boolean {
  return version.split('.').length > 1
}
