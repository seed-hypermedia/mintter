import { Editor } from 'slate'

export type EditorPageProps = {
  editor?: Editor;
  shouldAutosave?: boolean
}

export type PublicationPageProps = {
  params?: { docId: string; version: string; blockId?: string }
}
