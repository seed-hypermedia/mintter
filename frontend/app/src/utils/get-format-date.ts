import type { Document } from '@app/client'
import { EditorDocument } from '@app/editor/use-editor-draft'

type Keys<T> = { [P in keyof T]: T[P] }[typeof P]

type KeyOfType<T, U = Keys<T>> = { [P in keyof T]: T[P] extends U ? P : never }[keyof T]

export type DateKeys = KeyOfType<Document, Date | undefined>

export function getDateFormat(document: EditorDocument | Document | undefined, key: DateKeys) {

  if (!document) return ''

  var months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  var date = new Date(document[key]!)

  return date.toLocaleString("en-us", { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}
