import {Editor} from 'slate'

export type EditorPageProps = {
  params?: {docId: string; blockId?: string}
  editor?: Editor
}

export type PublicationPageProps = {
  params?: {docId: string; version: string; blockId?: string}
}
