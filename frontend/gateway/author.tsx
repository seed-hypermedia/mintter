import {useQuery} from '@tanstack/react-query'
import {Publication} from './client'
import {getAccount} from './client/accounts'
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
        <Author id={publication?.document.author} />
      </p>
      <p>
        Published at: {formattedDate(publication.document.publishTime as Date)}
      </p>
      <p>
        Last update: {formattedDate(publication.document.updateTime as Date)}
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
