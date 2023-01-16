import {useRouter} from 'next/router'
import {PublicationPage} from '../../publication-page'

export default function PublicationPageWrapper() {
  const router = useRouter()
  let [docId, version] = router.query.ids || []

  return <PublicationPage documentId={docId} version={version} />
}
