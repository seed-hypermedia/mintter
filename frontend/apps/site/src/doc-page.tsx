import {createHmId} from '@mintter/shared'
import {useRouter} from 'next/router'
import {PublicationPage} from './publication-page'

export function DocPage() {
  const router = useRouter()
  const versionId = router.query.versionId ? String(router.query.versionId) : ''
  const docEid = router.query.docEid ? String(router.query.docEid) : ''
  const docId = createHmId('d', docEid)
  return <PublicationPage documentId={docId} version={versionId} />
}
