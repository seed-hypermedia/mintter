import {useQuery} from '@tanstack/react-query'
import {useInterpret, useMachine} from '@xstate/react'
import {getPublication} from '../../client'
import Footer from '../../footer'
import {SiteHead} from '../../site-head'
import {publicationMachine} from '../../machines/publication-machine'
import {useRouter} from 'next/router'
import {PublicationPage} from '../../publication-page'

export default function PublicationPageWrapper() {
  const router = useRouter()
  let [docId, version] = router.query.ids || []

  return <PublicationPage documentId={docId} version={version} />
}
