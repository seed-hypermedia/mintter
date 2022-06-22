import type {Document} from '@app/client'
import {EditorDocument} from '@app/editor/use-editor-draft'

type KeyOfType<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T]

export type DateKeys = KeyOfType<Document, Date | undefined>

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

export function getDateFormat(
  document: EditorDocument | Document | undefined,
  key: DateKeys,
) {
  if (!document) return ''

  var date = new Date(document[key]!)

  return `${
    months[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()} at ${date.getHours()}:${date.getMinutes()}`
}

export function formattedDate(value: Date) {
  var date = new Date(value)

  return `${
    months[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()} at ${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
