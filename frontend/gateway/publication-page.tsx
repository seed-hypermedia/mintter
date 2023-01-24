import {useQuery} from '@tanstack/react-query'
import {useInterpret, useMachine} from '@xstate/react'
import {getPublication} from '@mintter/shared'
import Footer from './footer'
import {SiteHead} from './site-head'
import {publicationMachine} from './machines/publication-machine'
import {PublicationContent} from './publication-content'

type PublicationPageProps = {
  documentId: string
  version?: string
  onlyContent?: boolean
}

export function PublicationPage({
  documentId,
  version,
  onlyContent = false,
}: PublicationPageProps) {
  let service = useInterpret(() => publicationMachine)

  useQuery({
    queryKey: ['PUBLICATION', documentId, version],
    queryFn: () => getPublication(documentId, version),
    onError: (props) => {
      console.log('ERROR', props)
    },
    onSettled: (publication, error) => {
      if (publication) {
        service.send({type: 'PUBLICATION.FETCH.SUCCESS', publication})
      } else {
        service.send({
          type: 'PUBLICATION.FETCH.ERROR',
          errorMessage: `fetch error: ${error}`,
        })
      }
    },
  })

  return (
    <>
      <SiteHead />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-100"
      >
        <PublicationContent service={service} onlyContent={onlyContent} />
      </main>
      <Footer />
    </>
  )
}
