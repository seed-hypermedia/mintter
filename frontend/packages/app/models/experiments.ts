import {trpc} from '@mintter/desktop/src/trpc'
import {useQueryInvalidator} from '../app-context'
import {toast} from '../toast'

export function useExperiments() {
  const experiments = trpc.experiments.get.useQuery()
  return experiments
}

export function useWriteExperiments() {
  const invalidate = useQueryInvalidator()
  const writeExperiments = trpc.experiments.write.useMutation({
    onError() {
      toast.error('Could not save this change')
    },
    onSuccess() {
      invalidate(['trpc.experiments.get'])
    },
  })
  return writeExperiments
}

export function useHasDevTools() {
  return !!useExperiments().data?.developerTools
}
