import {useQuery} from '@tanstack/react-query'
import {Publication, getAccount} from '@mintter/client'
import {formattedDate} from './utils/get-format-date'

export function PublicationMetadata({
  publication,
}: {
  publication?: Publication
}) {
  return publication ? (
    <aside className="aside-content text-base document-metadata">
      <p>
        <span>author:&nbsp;</span>
        {publication?.document?.author ? (
          <Author id={publication.document.author} />
        ) : null}
      </p>
      <p>
        Published at:{' '}
        {publication?.document?.publishTime
          ? formattedDate(publication.document.publishTime as Date)
          : null}
      </p>
      <p>
        Last update:{' '}
        {publication?.document?.updateTime
          ? formattedDate(publication.document.updateTime as Date)
          : null}
      </p>
    </aside>
  ) : null
}

function Author({id}: {id: string}) {
  let {data, status} = useQuery({
    queryKey: ['AUTHOR', id],
    queryFn: ({queryKey}) => getAccount(queryKey[1]),
    retry: false,
  })
  if (status == 'loading') {
    return <AuthorPlaceholder />
  }

  if (status == 'error') {
    console.error(data)
    return <span>author request error: {id}</span>
  }

  return <span>{data?.profile?.alias}</span>
}

function AuthorPlaceholder() {
  return <span>...</span>
}
