import type {Document} from 'frontend/client/.generated/documents/v1alpha/documents'
import {useCallback} from 'react'
import {format} from 'date-fns'

type Keys<T> = {[P in keyof T]: T[P]}[typeof P]

type KeyOfType<T, U = Keys<T>> = {[P in keyof T]: T[P] extends U ? P : never}[keyof T]

export type DateKeys = KeyOfType<Document, Date | undefined>

export function getDateFormat(document: Document, key: DateKeys, dateFormat?: string = 'MMMM d, yyyy') {
  return format(new Date(document[key]), dateFormat)
}
