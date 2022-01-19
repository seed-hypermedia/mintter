import {EditorDocument} from '@app/editor/use-editor-draft'
import {sidepanelModel, useSidepanel} from '@components/sidepanel'
import {useEffect} from 'react'

export function useLoadAnnotations(document?: EditorDocument) {
  const sidepanelService = useSidepanel()

  useEffect(() => {
    if (document) {
      sidepanelService.send(sidepanelModel.events.SIDEPANEL_LOAD_ANNOTATIONS(document.content))
    }
  }, [document])
}
