import {useSyncExternalStore} from 'react'
import type {StateStream} from '@mintter/shared/src/utils/stream'

export function useStream<V>(stream: StateStream<V>): V {
  return useSyncExternalStore(
    (onStoreChange) => {
      return stream.subscribe(onStoreChange)
    },
    () => stream.get(),
  )
}
