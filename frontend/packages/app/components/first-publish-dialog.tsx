import {createPublicWebHmUrl, unpackDocId} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Dialog,
  DialogDescription,
  DialogTitle,
  Spinner,
  XStack,
} from '@mintter/ui'
import {useAppContext} from '../app-context'
import {PublicationRoute} from '../utils/navigation'
import {useIsHMUrlReady} from '../models/networking'

export function FirstPublishDialog({
  input,
}: {
  input: {route: PublicationRoute; version: string}
}) {
  const id = unpackDocId(input.route.documentId)
  const webUrl =
    id &&
    createPublicWebHmUrl('d', id.eid, {
      version: input.version,
    })
  const {externalOpen} = useAppContext()
  const {didTimeout, linkMeta} = useIsHMUrlReady(webUrl, 45)
  return (
    <>
      <DialogTitle>Congrats on your first publication!</DialogTitle>
      <DialogDescription>
        This content will now be available to your peers.
      </DialogDescription>
      <DialogDescription>
        While your content is online, the public Hypermedia gateway will serve
        your document to the web.
      </DialogDescription>
      {didTimeout ? (
        <DialogDescription color="$red10">
          We failed to share this document on the hyper.media gateway.
        </DialogDescription>
      ) : null}
      {webUrl ? (
        linkMeta ? (
          <ButtonText
            color="$blue10"
            hoverStyle={{
              textDecorationLine: 'underline',
            }}
            onPress={() => {
              externalOpen(webUrl)
            }}
          >
            {webUrl}
          </ButtonText>
        ) : didTimeout ? null : (
          <Spinner />
        )
      ) : null}
      <XStack jc="flex-end">
        <Dialog.Close asChild>
          <Button>Done</Button>
        </Dialog.Close>
      </XStack>
    </>
  )
}
