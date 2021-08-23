import {useState, useEffect} from 'react'
import {useDebounce} from './use-debounce'
import {useMutation} from 'react-query'
import {Box} from '@mintter/ui/box'
import {Text} from '@mintter/ui/text'

const message = {
  error: {
    color: 'danger',
    text: 'error saving document!',
  },
  loading: {
    color: 'muted',
    text: 'saving...',
  },
  success: {
    color: 'success',
    text: 'draft saved!',
  },
}

export function AutosaveStatus({save}) {
  const {status, isLoading} = useAutosave(save)

  return (
    <Box css={{paddingHorizontal: '$5'}}>
      {message[status] ? <Text color={message[status].color}>{message[status].text}</Text> : <Text> </Text>}
    </Box>
  )
}

export function useAutosave(callBack: () => Promise<void>) {
  let [key, setKey] = useState<number>(0)

  const shouldSave = useDebounce(key, 1000)

  const {mutateAsync, status, isLoading, isIdle} = useMutation(callBack)

  const onKeyDownEvent = (event: KeyboardEvent) => {
    setKey(key++)
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDownEvent)

    return () => {
      window.removeEventListener('keydown', onKeyDownEvent)
    }
  }, [])

  useEffect(async () => {
    if (shouldSave) {
      await mutateAsync()
    }
  }, [shouldSave])

  return {isLoading, status}
}
