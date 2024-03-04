import {AuthorVariant, GroupVariant, PublicationVariant, unpackHmId} from '.'
import {GRPCClient} from './grpc-client'

type GroupEntry = {
  groupId: string
  pathName: string | null
}
export function groupsVariantsMatch(
  a: undefined | GroupEntry[],
  b: undefined | GroupEntry[],
) {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((aEntry) =>
    b.some(
      (bEntry) =>
        aEntry.groupId === bEntry.groupId &&
        aEntry.pathName === bEntry.pathName,
    ),
  )
}

export function stringArrayMatch(a: string[], b: string[]) {
  const sortedB = b.slice().sort()
  return (
    a.length === b.length &&
    a
      .slice()
      .sort()
      .every((val, index) => val === sortedB[index])
  )
}

export async function getPublicationVariant(
  grpcClient: GRPCClient,
  documentId: string,
  variants: PublicationVariant[] | null | undefined,
  versionId: string | null | undefined,
  latest: boolean = false,
) {
  let variantVersion = null
  const requestedVersion = latest ? undefined : versionId
  const groupVariants = variants?.filter((v) => v.key === 'group') as
    | GroupVariant[]
    | undefined
  const groupVariant = groupVariants ? groupVariants[0] : undefined
  const authorVariants = variants?.filter((v) => v.key === 'author') as
    | AuthorVariant[]
    | undefined
  if (groupVariants && groupVariants.length > 1) {
    throw new Error('Only one group variant is currently allowed')
  }
  if (authorVariants && authorVariants.length > 0 && groupVariant) {
    throw new Error('Cannot currently specify multiple variant types')
  }
  if (groupVariant) {
    const docGroups = await grpcClient.groups.listDocumentGroups({
      documentId,
    })
    const docGroupEntry = docGroups.items
      .filter(
        (d) =>
          d.groupId === groupVariant.groupId &&
          d.path === groupVariant.pathName,
      )
      .sort((a, b) => {
        const aTime = a.changeTime?.seconds
        const bTime = b.changeTime?.seconds
        if (!aTime || !bTime) return 0
        return Number(bTime - aTime)
      })[0]
    const groupEntryId =
      typeof docGroupEntry?.rawUrl === 'string'
        ? unpackHmId(docGroupEntry?.rawUrl)
        : null
    if (groupEntryId?.qid === documentId && !!groupEntryId?.version) {
      variantVersion = groupEntryId?.version
    } else {
      // the user has requested a group variant but we dont have that group or the path name is no longer here
      // throw new Error(
      //   `Could not find version for doc "${documentId}" in group "${groupVariant.groupId}" with name "${groupVariant.pathName}"`,
      // )
    }
  } else if (authorVariants?.length) {
    const timeline = await grpcClient.entities.getEntityTimeline({
      id: documentId,
    })

    const variantAuthors = new Set(
      authorVariants.map((variant) => variant.author),
    )
    const authorVersions = timeline?.authorVersions.filter((authorVersion) =>
      variantAuthors.has(authorVersion.author),
    )
    const activeChanges = new Set<string>()
    authorVersions?.forEach((versionItem) => {
      versionItem.version.split('.').forEach((changeId) => {
        activeChanges.add(changeId)
      })
    })
    if (activeChanges.size) {
      variantVersion = [...activeChanges].join('.')
    } else {
      throw new Error(
        `Could not find active changes for authors ${[...variantAuthors].join(
          ', ',
        )}`,
      )
    }
  }
  const resolvedPub = await grpcClient.publications
    .getPublication({
      documentId,
      version: requestedVersion || variantVersion || '',
      localOnly: true, // avoid DHT fetching
    })
    .catch((e) => undefined)

  return {publication: resolvedPub, variantVersion, variants, requestedVersion}
}
