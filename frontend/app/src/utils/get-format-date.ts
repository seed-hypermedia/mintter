import type {Document} from '@mintter/client'

type Keys<T> = {[P in keyof T]: T[P]}[typeof P]

type KeyOfType<T, U = Keys<T>> = {[P in keyof T]: T[P] extends U ? P : never}[keyof T]

export type DateKeys = KeyOfType<Document, Date | undefined>

export function getDateFormat(document: Document, key: DateKeys) {
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

  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}
