import {Publication, formattedDate, Account} from '@mintter/shared'

export function PublicationMetadata({
  publication,
  author,
}: {
  publication?: Publication
  author?: Account | null
}) {
  return publication ? (
    <aside className="text-base aside-content document-metadata">
      <p>
        <span>author:&nbsp;</span>
        {author?.profile?.alias}
      </p>
      <p>
        Published at:{' '}
        {publication?.document?.publishTime
          ? formattedDate(publication.document.publishTime)
          : null}
      </p>
      <p>
        Last update:{' '}
        {publication?.document?.updateTime
          ? formattedDate(publication.document.updateTime)
          : null}
      </p>
    </aside>
  ) : null
}
