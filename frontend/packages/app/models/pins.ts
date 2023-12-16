import {trpc} from '@mintter/desktop/src/trpc'
import {unpackDocId} from '@mintter/shared'
import {useQueryInvalidator} from '../app-context'
import {PublicationRoute} from '../utils/navigation'
import {useGroupsContent} from './groups'

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

export function usePins() {
  const pins = trpc.pins.get.useQuery()
  const groupIds = pins.data?.groups.map((group) => group.groupId)
  const groupContentQueries = useGroupsContent(groupIds || [])
  if (!pins.data) return pins
  return {
    ...pins,
    data: {
      ...pins.data,
      groups: pins.data.groups.map((group) => {
        return {
          ...group,
          documents: group.documents
            .map((docPin) => {
              if (!docPin.pathName) return undefined
              const queryIndex = groupIds?.findIndex(
                (id) => id === group.groupId,
              )
              if (queryIndex == null || queryIndex === -1) return undefined
              const resolvedPinUrl =
                groupContentQueries[queryIndex].data?.content?.[docPin.pathName]
              if (!resolvedPinUrl) return undefined
              const resolvedPinId = unpackDocId(resolvedPinUrl)
              if (!resolvedPinId) return undefined
              return {
                ...docPin,
                docId: resolvedPinId.docId,
                docVersion: resolvedPinId.version,
              }
            })
            .filter(Boolean),
        }
      }),
    },
  }
}

export function usePinDocument(route: PublicationRoute) {
  const invalidate = useQueryInvalidator()
  const mutationOpts = {
    onSuccess: () => {
      invalidate(['trpc.pins.get'])
    },
  }
  const addPin = trpc.pins.addDocument.useMutation(mutationOpts)
  const addGroupPin = trpc.pins.addGroupDocument.useMutation(mutationOpts)
  const removePin = trpc.pins.removeDocument.useMutation(mutationOpts)
  const removeGroupPin = trpc.pins.removeGroupDocument.useMutation(mutationOpts)
  const pins = trpc.pins.get.useQuery()

  const isPinnedDoc =
    route.variant?.key !== 'group' &&
    !!pins.data?.documents.find(({docId, authors}) => {
      if (docId !== route.documentId) return false
      const routeAuthors =
        route.variant?.key === 'authors' ? route.variant.authors : null
      if (!routeAuthors) return authors.length === 0
      return arrayMatch(routeAuthors, authors)
    })
  const groupVariant =
    route.variant?.key === 'group' ? route.variant : undefined
  const contextGroupId = groupVariant?.groupId
  const isPinnedGroup =
    !!groupVariant &&
    !!pins.data?.groups.find(
      (group) =>
        group.groupId === contextGroupId &&
        !!group.documents.find(
          ({pathName}) => pathName === groupVariant?.pathName,
        ),
    )
  const isPinned = isPinnedDoc || isPinnedGroup
  function pin() {
    if (route.variant?.key === 'group') {
      console.log('yes mutate addGroupPin', route)
      addGroupPin.mutate({
        docId: route.documentId,
        groupId: route.variant.groupId,
        pathName: route.variant.pathName,
      })
    } else {
      addPin.mutate({
        docId: route.documentId,
        authors: route.variant?.key === 'authors' ? route.variant.authors : [],
      })
    }
  }
  function unpin() {
    if (route.variant?.key === 'group') {
      removeGroupPin.mutate({
        docId: route.documentId,
        groupId: route.variant.groupId,
        pathName: route.variant.pathName,
      })
    } else {
      removePin.mutate({
        docId: route.documentId,
        authors: route.variant?.key === 'authors' ? route.variant.authors : [],
      })
    }
  }
  function togglePin() {
    if (isPinned) {
      unpin()
    } else {
      pin()
    }
  }
  return {
    isPinned,
    togglePin,
    pin,
    unpin,
  }
}

export function arrayMatch(a: string[], b: string[]) {
  const sortedB = b.slice().sort()
  return (
    a.length === b.length &&
    a
      .slice()
      .sort()
      .every((val, index) => val === sortedB[index])
  )
}
