import {useQuery} from '@tanstack/react-query'
import {Publication, getAccount, formattedDate} from '@mintter/shared'
import {transport} from './client'

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

function Author({id}: {id: string}) {
  let {data, status} = useQuery({
    queryKey: ['AUTHOR', id],
    queryFn: ({queryKey}) => getAccount(queryKey[1], transport),
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
