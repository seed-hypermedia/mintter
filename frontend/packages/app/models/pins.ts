import {trpc} from '@mintter/desktop/src/trpc'
import {useQueryInvalidator} from '../app-context'
import {PublicationRoute} from '../utils/navigation'

export function useToggleAccountPin(accountId: string) {
  const invalidate = useQueryInvalidator()
  const addPin = trpc.pins.addAccount.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const removePin = trpc.pins.removeAccount.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const pins = trpc.pins.get.useQuery()
  const isPinned = pins.data?.accounts.indexOf(accountId) !== -1
  function togglePin() {
    if (isPinned) {
      removePin.mutate(accountId)
    } else {
      addPin.mutate(accountId)
    }
  }
  return {
    isPinned,
    togglePin,
  }
}

export function useToggleGroupPin(groupId: string) {
  const invalidate = useQueryInvalidator()
  const addPin = trpc.pins.addGroup.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const removePin = trpc.pins.addGroup.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const pins = trpc.pins.get.useQuery()
  const isPinned = !!pins.data?.groups.find((group) => group.groupId || groupId)
  function togglePin() {
    if (isPinned) {
      removePin.mutate(groupId)
    } else {
      addPin.mutate(groupId)
    }
  }
  return {
    isPinned,
    togglePin,
  }
}

export function useToggleDocumentPin(route: PublicationRoute) {
  const pubInfo = {
    docId: route.documentId,
    groupId:
      route.pubContext?.key === 'group' ? route.pubContext.groupId : undefined,
    pathName:
      route.pubContext?.key === 'group' ? route.pubContext.pathName : undefined,
    isTrusted: route.pubContext?.key === 'trusted',
  }
  const invalidate = useQueryInvalidator()
  const addPin = trpc.pins.addDocument.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const removePin = trpc.pins.addDocument.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const pins = trpc.pins.get.useQuery()
  const isPinnedTrusted = !!pins.data?.trustedDocuments.find(
    (docId) => docId === route.documentId,
  )
  const isPinnedAll = !!pins.data?.allDocuments.find(
    (docId) => docId === route.documentId,
  )
  const contextGroupId =
    route.pubContext?.key === 'group' ? route.pubContext.groupId : undefined
  const isPinnedGroup =
    !!contextGroupId &&
    !!pins.data?.groups.find(
      (group) =>
        group.groupId === contextGroupId &&
        !!group.documents.find((docId) => docId === route.documentId),
    )
  const isPinned = isPinnedTrusted || isPinnedAll || isPinnedGroup
  function togglePin() {
    if (isPinned) {
      removePin.mutate(pubInfo)
    } else {
      addPin.mutate(pubInfo)
    }
  }
  return {
    isPinned: false,
    togglePin,
  }
}
