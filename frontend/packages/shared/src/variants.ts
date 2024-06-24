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
  versionId: string | null | undefined,
  latest: boolean = false,
) {
  const requestedVersion = latest ? undefined : versionId

  const resolvedPub = await grpcClient.publications
    .getPublication({
      documentId,
      version: requestedVersion || '',
      localOnly: true, // avoid DHT fetching
    })
    .catch((e) => undefined)

  return {publication: resolvedPub, requestedVersion}
}
