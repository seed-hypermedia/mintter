import {trpc} from '@mintter/desktop/src/trpc'
import {
  AuthorVariant,
  GroupVariant,
  groupsVariantsMatch,
  stringArrayMatch,
  unpackDocId,
} from '@mintter/shared'
import {useMemo} from 'react'
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

function extractVariants(route: PublicationRoute) {
  const groupVariants = (route.variants?.filter((v) => v.key === 'group') ||
    []) as GroupVariant[]
  const authorVariants = (route.variants?.filter((v) => v.key === 'author') ||
    []) as AuthorVariant[]
  return {
    groupVariants,
    authorVariants,
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
  const variants = extractVariants(route)
  const isPinnedDoc = useMemo(() => {
    const variants = extractVariants(route)
    return !!pins.data?.documents.find(({docId, authors, groups}) => {
      if (docId !== route.documentId) return false
      const routeAuthors = variants.authorVariants.map((a) => a.author)
      const routeGroups = variants.groupVariants.map((g) => ({
        groupId: g.groupId,
        pathName: g.pathName,
      }))
      if (!routeAuthors) return authors.length === 0
      return (
        stringArrayMatch(routeAuthors, authors) &&
        groupsVariantsMatch(routeGroups, groups)
      )
    })
  }, [pins.data, route])

  const singleGroupVariant: undefined | {pathName: string; groupId: string} =
    variants.authorVariants.length > 0 ||
    variants.groupVariants.length !== 1 ||
    variants.groupVariants[0]?.pathName === null
      ? undefined
      : variants.groupVariants[0]
  const singleGroupVariantId = singleGroupVariant?.groupId
  const isPinnedGroup =
    !!singleGroupVariant &&
    !!pins.data?.groups.find(
      (group) =>
        group.groupId === singleGroupVariantId &&
        !!group.documents.find(
          ({pathName}) => pathName === singleGroupVariant?.pathName,
        ),
    )
  const isPinned = isPinnedDoc || isPinnedGroup
  function pin() {
    if (singleGroupVariant) {
      addGroupPin.mutate({
        groupId: singleGroupVariant.groupId,
        pathName: singleGroupVariant.pathName,
      })
    } else {
      addPin.mutate({
        docId: route.documentId,
        authors: variants.authorVariants.map((a) => a.author),
        groups: variants.groupVariants.map((g) => ({
          groupId: g.groupId,
          pathName: g.pathName,
        })),
      })
    }
  }
  function unpin() {
    if (singleGroupVariant) {
      removeGroupPin.mutate({
        groupId: singleGroupVariant.groupId,
        pathName: singleGroupVariant.pathName,
      })
    } else {
      removePin.mutate({
        docId: route.documentId,
        authors: variants.authorVariants.map((a) => a.author),
        groups: variants.groupVariants.map((g) => ({
          groupId: g.groupId,
          pathName: g.pathName,
        })),
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
