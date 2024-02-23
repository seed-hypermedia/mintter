import {observable} from '@trpc/server/observable'
import {t} from './app-trpc'

const invalidationHandlers = new Set<(queryKey: any) => void>()

export function invalidateQueries(queryKey: any) {
  invalidationHandlers.forEach((handler) => handler(queryKey))
}

export const queryInvalidation = t.procedure.subscription(() => {
  return observable((emit) => {
    function handler(value: unknown[]) {
      emit.next(value)
    }
    invalidationHandlers.add(handler)
    return () => {
      invalidationHandlers.delete(handler)
    }
  })
})
