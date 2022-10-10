import {useMain, usePublicationList} from '@app/main-context'
import {MainWindow} from '@app/pages/window-components'
import {FileList} from '../components/file-list'

export function PublicationList() {
  const mainService = useMain()
  let pubList = usePublicationList()
  return (
    <MainWindow>
      <FileList
        title="Inbox"
        items={pubList}
        handleNewDraft={() => mainService.send('CREATE.NEW.DRAFT')}
        handleNewWindow={() => mainService.send('COMMIT.OPEN.WINDOW')}
        emptyLabel="You have no Publications yet."
      />
    </MainWindow>
  )
}
