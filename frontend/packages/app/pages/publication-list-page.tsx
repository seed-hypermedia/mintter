import {EmptyList} from '@mintter/app/components/empty-list'
import Footer from '@mintter/app/components/footer'
import {PublicationListItem} from '@mintter/app/components/publication-list-item'
import {useDraftList, usePublicationList} from '@mintter/app/models/documents'
import {useOpenDraft} from '@mintter/app/utils/open-draft'
import {
  Button,
  ButtonText,
  Container,
  Copy,
  Delete,
  DialogDescription,
  DialogTitle,
  Form,
  Label,
  MainWrapper,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from '@mintter/ui'

import {zodResolver} from '@hookform/resolvers/zod'
import {createPublicWebHmUrl, idToUrl, unpackHmId} from '@mintter/shared'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useForm} from 'react-hook-form'
import {z} from 'zod'
import {useAppContext} from '../app-context'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useAppDialog} from '../components/dialog'
import {FormInput} from '../components/form-input'
import {copyLinkMenuItem} from '../components/list-item'
import {queryPublication, useCreatePublication} from '../models/documents'
import {useWaitForPublication} from '../models/web-links'
import {useDaemonReady} from '../node-status-context'
import {useOpenUrl} from '../open-url'
import {toast} from '../toast'

export function PublicationListPage({
  trustedOnly,
  empty,
}: {
  trustedOnly: boolean
  empty?: React.ReactNode
}) {
  let publications = usePublicationList({trustedOnly})
  let drafts = useDraftList()
  let {queryClient, grpcClient} = useAppContext()
  let openDraft = useOpenDraft('push')
  const pubs = publications.data?.publications

  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})

  if (pubs) {
    if (pubs.length) {
      return (
        <>
          <MainWrapper>
            <Container>
              {pubs.map((publication) => {
                const docId = publication.document?.id
                if (!docId) return null
                return (
                  <PublicationListItem
                    pubContext={trustedOnly ? {key: 'trusted'} : null}
                    openRoute={{
                      key: 'publication',
                      documentId: docId,
                      pubContext: trustedOnly ? {key: 'trusted'} : null,
                    }}
                    key={publication.document?.id}
                    hasDraft={drafts.data?.documents.find(
                      (d) => d.id == publication.document?.id,
                    )}
                    onPointerEnter={() => {
                      if (publication.document?.id) {
                        queryClient.client.prefetchQuery(
                          queryPublication(
                            grpcClient,
                            publication.document.id,
                            publication.version,
                          ),
                        )
                      }
                    }}
                    publication={publication}
                    menuItems={[
                      copyLinkMenuItem(
                        idToUrl(docId, undefined, publication.version),
                        'Publication',
                      ),
                      {
                        key: 'delete',
                        label: 'Delete Publication',
                        icon: Delete,
                        onPress: () => {
                          deleteDialog.open(docId)
                        },
                      },
                    ]}
                  />
                )
              })}
            </Container>
            {deleteDialog.content}
          </MainWrapper>
          <Footer />
        </>
      )
    } else {
      return (
        <>
          <MainWrapper>
            <Container>
              {empty || (
                <EmptyList
                  description="You have no Publications yet."
                  action={() => {
                    openDraft()
                  }}
                />
              )}
            </Container>
          </MainWrapper>
          <Footer />
        </>
      )
    }
  }

  if (publications.error) {
    return (
      <MainWrapper>
        <Container>
          <YStack gap="$3" alignItems="flex-start" maxWidth={500} padding="$8">
            <SizableText fontFamily="$body" fontWeight="700" fontSize="$6">
              Publication List Error
            </SizableText>
            <SizableText fontFamily="$body" fontSize="$4">
              {JSON.stringify(publications.error)}
            </SizableText>
            <Button theme="yellow" onPress={() => publications.refetch()}>
              try again
            </Button>
          </YStack>
        </Container>
      </MainWrapper>
    )
  }

  return (
    <>
      <MainWrapper>
        <Container>
          <Spinner />
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}

function PublishedFirstDocDialog({
  input,
  onClose,
}: {
  input: {docId: string}
  onClose: () => void
}) {
  const {externalOpen} = useAppContext()
  const id = unpackHmId(input.docId)
  if (!id) throw new Error('invalid doc id')
  const url = createPublicWebHmUrl('d', id.eid)
  const {resultMeta, timedOut} = useWaitForPublication(url, 120)
  return (
    <>
      <DialogTitle>Congrats!</DialogTitle>
      <DialogDescription>
        Your doc has been published. You can share your doc on the public
        Hypermedia gateway:
      </DialogDescription>
      <XStack jc="space-between" ai="center">
        {resultMeta ? (
          <ButtonText
            color="$blue10"
            size="$2"
            fontFamily={'$mono'}
            fontSize="$4"
            onPress={() => {
              externalOpen(url)
            }}
          >
            {url}
          </ButtonText>
        ) : (
          <Spinner />
        )}
        {timedOut ? (
          <DialogDescription theme="red">
            We failed to publish your document to the hypermedia gateway. Please
            try again later.
          </DialogDescription>
        ) : null}
        <Button
          size="$2"
          icon={Copy}
          onPress={() => {
            copyTextToClipboard(url)
            toast.success('Copied link to document')
          }}
        />
      </XStack>
      <Button onPress={onClose}>Done</Button>
    </>
  )
}

const newDocFields = z.object({
  title: z.string(),
})
type NewGroupFields = z.infer<typeof newDocFields>

export function CreateFirstDocForm({
  onSuccess,
}: {
  onSuccess: (docId: string) => void
}) {
  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<NewGroupFields>({
    resolver: zodResolver(newDocFields),
    defaultValues: {
      title: `Hello, World`,
    },
  })
  const openUrl = useOpenUrl()
  const createPublication = useCreatePublication()
  const isDaemonReady = useDaemonReady()
  if (!isDaemonReady) return <Spinner />
  return (
    <YStack>
      <Button
        onPress={() => {
          openUrl('https://hyper.media/d/FHD735zUfVznrESN5s9JMz')
        }}
      >
        Open Welcome Document
      </Button>
      <Form
        onSubmit={handleSubmit(async (values) =>
          createPublication.mutateAsync(values.title).then((docId) => {
            toast.success('Published Document')
            onSuccess(docId)
          }),
        )}
      >
        <Label htmlFor="title">Title</Label>
        <FormInput placeholder={'Group Name'} control={control} name="title" />
        <Form.Trigger>
          <Button>Create Document</Button>
        </Form.Trigger>
      </Form>
    </YStack>
  )
}

export default function TrustedPublicationList() {
  const successDialog = useAppDialog(PublishedFirstDocDialog)

  return (
    <>
      <PublicationListPage
        trustedOnly={true}
        // // disabled welcome experience
        // empty={
        //   <CreateFirstDocForm
        //     onSuccess={(docId) => successDialog.open({docId})}
        //   />
        // }
      />
      {successDialog.content}
    </>
  )
}
