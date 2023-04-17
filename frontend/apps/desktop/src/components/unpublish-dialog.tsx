import {useSiteUnpublish} from '@app/models/sites'
import {Alert} from '@components/alert'
import {overlayStyles} from '@components/dialog-styles'
import {WebPublicationRecord} from '@mintter/shared'
import {MouseEvent, useState} from 'react'
import {toast} from 'react-hot-toast'

export function useUnpublishDialog(
  hostname: string,
  pub: WebPublicationRecord,
) {
  const [isOpen, setIsOpen] = useState(false)
  const unpublish = useSiteUnpublish()
  const content = (
    <Alert.Root open={isOpen} onOpenChange={setIsOpen}>
      <Alert.Portal>
        <Alert.Overlay className={overlayStyles()} />
        <Alert.Content>
          <Alert.Title color="danger">Un-Publish from Site</Alert.Title>
          <Alert.Description>
            {pub.path == null
              ? `This document may no longer be visible on this site.`
              : `This document will no longer be visible at /${pub.path}`}
          </Alert.Description>
          <Alert.Actions>
            <Alert.Cancel>Cancel</Alert.Cancel>
            <Alert.Action
              color="danger"
              disabled={unpublish.isLoading}
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                e.preventDefault()
                unpublish
                  .mutateAsync({
                    hostname,
                    documentId: pub.documentId,
                    version: pub.version,
                  })
                  .then(() => {
                    setIsOpen(false)
                  })
                  .catch((e) => {
                    console.error(e)
                    toast('Error un-publishing document', {})
                  })
              }}
            >
              Remove Publication
            </Alert.Action>
          </Alert.Actions>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  )
  return [
    content,
    () => {
      setIsOpen(true)
    },
  ] as const
}
