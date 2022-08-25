import {useDraftList, useMain} from '@app/main-context'
import {MainWindow} from '@app/pages/window-components'
import {FileList} from '../components/file-list'

export function DraftList() {
  const mainService = useMain()
  let draftList = useDraftList()

  return (
    <MainWindow>
      <FileList
        title="Drafts"
        items={draftList}
        handleNewDraft={() => mainService.send('CREATE.NEW.DRAFT')}
        handleNewWindow={() => mainService.send('COMMIT.OPEN.WINDOW')}
        emptyLabel="You have no Drafts yet."
      />
    </MainWindow>
  )
}
