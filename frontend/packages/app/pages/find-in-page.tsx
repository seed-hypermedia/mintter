import {
  Button,
  ChevronDown,
  ChevronUp,
  Close,
  Input,
  XGroup,
  XStack,
} from '@mintter/ui'
import {useEffect, useRef, useState} from 'react'
import {AppIPC} from '../app-ipc'

export function FindInPage({ipc}: {ipc: AppIPC}) {
  const size = '$2'
  const [query, setQuery] = useState('')
  const queryInput = useRef<HTMLInputElement>(null)
  const [totalResults, setTotalResults] = useState(0)
  const [current, setCurrent] = useState(0)

  function clearFind() {
    setQuery('')
    ipc.send('find_in_page_cancel')
  }

  useEffect(() => {
    window.addEventListener('keydown', (e) => {
      if (e.key == 'Escape') {
        alert('Escape pressed')
        clearFind()
      }
    })
  }, [])

  useEffect(() => {
    // @ts-expect-error
    return window.appWindowEvents?.subscribe((event: AppWindowEvent) => {
      setTimeout(() => {
        queryInput.current?.focus()
        queryInput.current?.select()
      }, 100)
    })
  }, [])

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
            onKeyPress={handleKeyPress}
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
            bg="$color6"
            size={size}
            icon={ChevronDown}
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
            bg="$color6"
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
