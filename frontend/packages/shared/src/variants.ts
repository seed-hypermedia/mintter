import {AuthorVariant, PublicationVariant} from '.'
import {GRPCClient} from './grpc-client'

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
  const authorVariants = variants?.filter((v) => v.key === 'author') as
    | AuthorVariant[]
    | undefined
  if (authorVariants?.length) {
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
