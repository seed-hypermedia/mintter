import type {Document} from '@app/client'
import {EditorDocument} from '@app/editor/use-editor-draft'

type KeyOfType<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T]

export type DateKeys = KeyOfType<Document, Date | undefined>

export function getDateFormat(
  document: EditorDocument | Document | undefined,
  key: DateKeys,
) {
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

  if (!document) return ''

  var date = new Date(document[key]!)

  return `${
    months[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()} (${date.getHours()}:${date.getMinutes()})`
}
