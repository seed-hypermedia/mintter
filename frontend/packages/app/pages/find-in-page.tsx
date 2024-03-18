import {
  Button,
  ChevronDown,
  ChevronUp,
  Close,
  Input,
  XGroup,
  XStack,
} from '@mintter/ui'
import {useDeferredValue, useEffect, useRef, useState} from 'react'
import {AppIPC} from '../app-ipc'

export function FindInPage({ipc}: {ipc: AppIPC}) {
  const [active, setActive] = useState(false)
  const size = '$2'
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const queryInput = useRef<HTMLInputElement>(null)

  function clearFind() {
    setQuery('')
    ipc.send('find_in_page_cancel')
  }

  useEffect(() => {
    // @ts-expect-error
    return window.appWindowEvents?.subscribe((event: AppWindowEvent) => {
      if (event === 'find_in_page') {
        setActive((newVal) => {
          if (newVal) {
            clearFind()
          } else {
            queryInput.current?.focus()
          }

          return !newVal
        })
      }
    })
  }, [])

  useEffect(() => {
    if (deferredQuery.length > 0) {
      ipc.send('find_in_page_query', {query: deferredQuery, findNext: true})
    }
  }, [deferredQuery])

  return (
    <XStack fullscreen ai="center" jc="center">
      <XGroup
        elevation="$4"
        borderWidth={1}
        borderColor="$color8"
        animation="fast"
        bg="$color6"
        p="$1.5"
        borderRadius="$2"
        overflow="hidden"
      >
        <XGroup.Item>
          <Input
            ref={queryInput}
            unstyled
            bg="$backgroundStrong"
            size={size}
            placeholder="Find in page..."
            borderWidth={0}
            outline="none"
            onChangeText={setQuery}
          />
        </XGroup.Item>

        <XGroup.Item>
          <Button
            chromeless
            bg="$color6"
            size={size}
            icon={ChevronUp}
            onPress={() =>
              ipc.send('find_in_page_query', {
                query: deferredQuery,
                findNext: false,
                forward: false,
              })
            }
          />
        </XGroup.Item>
        <XGroup.Item>
          <Button
            chromeless
            bg="$color6"
            size={size}
            icon={ChevronDown}
            onPress={() =>
              ipc.send('find_in_page_query', {
                query: deferredQuery,
                findNext: false,
              })
            }
          />
        </XGroup.Item>
        <XGroup.Item>
          <Button
            chromeless
            bg="$color6"
            size={size}
            icon={Close}
            onPress={() => {
              setActive(false)
              clearFind()
            }}
          />
        </XGroup.Item>
      </XGroup>
    </XStack>
  )
}
