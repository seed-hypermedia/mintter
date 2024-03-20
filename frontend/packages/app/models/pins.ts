import {trpc} from '@mintter/desktop/src/trpc'
import {
  AuthorVariant,
  GroupVariant,
  PublicationVariant,
  groupsVariantsMatch,
  stringArrayMatch,
  unpackDocId,
} from '@mintter/shared'
import {useMemo} from 'react'
import {useQueryInvalidator} from '../app-context'
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
  function togglePin(e) {
    e.stopPropagation()
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

function extractVariants(variants: PublicationVariant[]) {
  const groupVariants = (variants?.filter((v) => v.key === 'group') ||
    []) as GroupVariant[]
  const authorVariants = (variants?.filter((v) => v.key === 'author') ||
    []) as AuthorVariant[]
  return {
    groupVariants,
    authorVariants,
  }
}

export function usePinDocument(docId: string, variants: PublicationVariant[]) {
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
  const {groupVariants, authorVariants} = extractVariants(variants)
  const isPinnedDoc = useMemo(() => {
    const {groupVariants, authorVariants} = extractVariants(variants)
    return !!pins.data?.documents.find((pin) => {
      const {authors, groups} = pin
      if (docId !== pin.docId) return false
      const routeAuthors = authorVariants.map((a) => a.author)
      const routeGroups = groupVariants.map((g) => ({
        groupId: g.groupId,
        pathName: g.pathName,
      }))
      if (!routeAuthors) return authors.length === 0
      return (
        stringArrayMatch(routeAuthors, authors) &&
        groupsVariantsMatch(routeGroups, groups)
      )
    })
  }, [pins.data, variants])

  const singleGroupVariant:
    | undefined
    | {pathName: string | null; groupId: string} =
    authorVariants.length > 0 ||
    groupVariants.length !== 1 ||
    groupVariants[0]?.pathName === null
      ? undefined
      : groupVariants[0]
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
    if (singleGroupVariant && singleGroupVariant.pathName != null) {
      addGroupPin.mutate({
        groupId: singleGroupVariant.groupId,
        pathName: singleGroupVariant.pathName,
      })
    } else {
      addPin.mutate({
        docId,
        authors: authorVariants.map((a) => a.author),
        groups: groupVariants.map((g) => ({
          groupId: g.groupId,
          pathName: g.pathName,
        })),
      })
    }
  }
  function unpin() {
    if (singleGroupVariant && singleGroupVariant.pathName != null) {
      removeGroupPin.mutate({
        groupId: singleGroupVariant.groupId,
        pathName: singleGroupVariant.pathName,
      })
    } else {
      removePin.mutate({
        docId,
        authors: authorVariants.map((a) => a.author),
        groups: groupVariants.map((g) => ({
          groupId: g.groupId,
          pathName: g.pathName || '',
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
