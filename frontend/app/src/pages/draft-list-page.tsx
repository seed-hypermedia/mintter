import {useDraftList, useMain} from '@app/main-context'
import {MainWindow} from '@app/pages/window-components'
import {ScrollArea} from '@components/scroll-area'
import {FileList} from '../components/file-list'

export function DraftList() {
  const mainService = useMain()
  let draftList = useDraftList()

  return (
    <MainWindow>
      <ScrollArea>
        <FileList
          title="Drafts"
          items={draftList}
          handleNewDraft={() => mainService.send('CREATE.NEW.DRAFT')}
          handleNewWindow={() => mainService.send('COMMIT.OPEN.WINDOW')}
          emptyLabel="You have no Drafts yet."
        />
      </ScrollArea>
    </MainWindow>
  )
}
