import {AppIPC} from '@/app-ipc'
import {
  Button,
  ChevronDown,
  ChevronUp,
  Close,
  Input,
  XGroup,
  XStack,
} from '@shm/ui'
import {useEffect, useRef, useState} from 'react'

export function FindInPage({ipc}: {ipc: AppIPC}) {
  const size = '$2'
  const [query, setQuery] = useState('')
  const queryInput = useRef<HTMLInputElement>(null)

  function clearFind() {
    setQuery('')
    ipc.send('find_in_page_cancel')
  }

  useEffect(() => {
    function handleEscape(e) {
      if (e.key == 'Escape') {
        e.preventDefault()
        clearFind()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [query])

  useEffect(() => {
    if (queryInput.current) {
      queryInput.current?.focus()
      queryInput.current?.select()
    }
    // @ts-expect-error
    return window.appWindowEvents?.subscribe((event: AppWindowEvent) => {
      if (event == 'find_in_page_focus') {
        setTimeout(() => {
          queryInput.current?.focus()
          queryInput.current?.select()
        }, 10)
      }
    })
  }, [queryInput.current])

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      clearFind()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      ipc.send('find_in_page_query', {
        query,
        findNext: false,
        forward: !event.shiftKey,
      })
    }
  }

  useEffect(() => {
    if (query.length > 0) {
      ipc.send('find_in_page_query', {query, findNext: true})
    }
  }, [query])

  return (
    <XStack fullscreen ai="center" jc="center">
      <XGroup
        elevation="$4"
        borderWidth={1}
        borderColor="$color8"
        animation="fast"
        bg="$backgroundStrong"
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
            onKeyPress={handleKeyPress}
          />
        </XGroup.Item>

        <XGroup.Item>
          <Button
            chromeless
            bg="$backgroundStrong"
            size={size}
            icon={ChevronUp}
            onPress={() =>
              ipc.send('find_in_page_query', {
                query,
                findNext: false,
                forward: false,
              })
            }
          />
        </XGroup.Item>
        <XGroup.Item>
          <Button
            chromeless
            bg="$backgroundStrong"
            size={size}
            icon={ChevronDown}
            onPress={() =>
              ipc.send('find_in_page_query', {
                query,
                findNext: false,
                forward: true,
              })
            }
          />
        </XGroup.Item>
        <XGroup.Item>
          <Button
            chromeless
            bg="$backgroundStrong"
            size={size}
            icon={Close}
            onPress={() => {
              clearFind()
            }}
          />
        </XGroup.Item>
      </XGroup>
    </XStack>
  )
}
