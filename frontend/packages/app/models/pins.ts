import {trpc} from '@mintter/desktop/src/trpc'
import {useQueryInvalidator} from '../app-context'
import {PublicationRoute} from '../utils/navigation'

export function usePinAccount(accountId: string) {
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
    pin() {
      addPin.mutate(accountId)
    },
    unpin() {
      removePin.mutate(accountId)
    },
  }
}

export function usePinGroup(groupId: string) {
  const invalidate = useQueryInvalidator()
  const addPin = trpc.pins.addGroup.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const removePin = trpc.pins.removeGroup.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const pins = trpc.pins.get.useQuery()
  const isPinned = !!pins.data?.groups.find((group) => group.groupId == groupId)
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
    pin() {
      addPin.mutate(groupId)
    },
    unpin() {
      removePin.mutate(groupId)
    },
  }
}

export function usePinDocument(route: PublicationRoute) {
  const pubInfo = {
    docId: route.documentId,
    groupId:
      route.pubContext?.key === 'group' ? route.pubContext.groupId : undefined,
    pathName:
      (route.pubContext?.key === 'group' ? route.pubContext.pathName : null) ||
      '/',
    isTrusted: route.pubContext?.key === 'trusted',
  }
  const invalidate = useQueryInvalidator()
  const addPin = trpc.pins.addDocument.useMutation({
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  })
  const removePin = trpc.pins.removeDocument.useMutation({
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
  const groupPubContext =
    route.pubContext?.key === 'group' ? route.pubContext : undefined
  const contextGroupId = groupPubContext?.groupId
  const isPinnedGroup =
    !!groupPubContext &&
    !!pins.data?.groups.find(
      (group) =>
        group.groupId === contextGroupId &&
        !!group.documents.find(
          ({docId, pathName}) =>
            docId === route.documentId &&
            pathName === groupPubContext?.pathName,
        ),
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
    isPinned,
    togglePin,
    pin() {
      addPin.mutate(pubInfo)
    },
    unpin() {
      removePin.mutate(pubInfo)
    },
  }
}
