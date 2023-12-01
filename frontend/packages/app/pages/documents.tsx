import {PublicationListPage} from './publication-list-page'

export default function DocumentsPage() {
  // const successDialog = useAppDialog(PublishedFirstDocDialog)

  return (
    <>
      <PublicationListPage
      // // disabled welcome experience
      // empty={
      //   <CreateFirstDocForm
      //     onSuccess={(docId) => successDialog.open({docId})}
      //   />
      // }
      />
      {/* {successDialog.content} */}
    </>
  )
}
