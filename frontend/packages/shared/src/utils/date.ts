import type {Document} from '../client'
import {Timestamp} from '@bufbuild/protobuf'

type KeyOfType<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T]

export type DateKeys = Exclude<
  KeyOfType<Document, Timestamp | undefined>,
  undefined
>

var months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export type HDTimestamp = string


export function formattedDate(value?: string | Date | Timestamp | HDTimestamp | undefined, options?: {onlyRelative?: boolean}) {
  const onlyRelative = !!options?.onlyRelative
  if (!value) return ''
  let _value =
    typeof value == 'string' ||
    (value instanceof Date && !isNaN(value.valueOf()))
      ? value
      : (value as Timestamp).toDate()

  var now = new Date()
  var date = new Date(_value)
  let formatter = new Intl.RelativeTimeFormat('en-US', {
    style: 'short',
  })

  var result = difference(date, now)

  let relative  = 'just now'
  if (result.year < -1) {
    relative= formatter.format(Math.floor(result.year), 'year')

  } else if (result.day < -30) {
    relative= formatter.format(Math.floor(result.day / 30), 'month')

  } else if (result.day < -1) {
    relative= formatter.format(Math.floor(result.day), 'day')
  } else if (result.hour < -1) {
relative= formatter.format(Math.floor(result.hour), 'hour')
  } else if (result.minute < -2) {
  relative= formatter.format(Math.floor(result.minute), 'minute')
  }

  
    if (onlyRelative) {
      return relative
  } else  if (result.year < -1) {
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  } else if (result.day > -1) {
    return relative
  } else {
    return `${date.getDate()} ${months[date.getMonth()]}`
    // within the same year: 9 Sep (day + short month)
  }
}

function difference(date1: Date, date2: Date) {
  const date1utc = Date.UTC(
    date1.getFullYear(),
    date1.getMonth(),
    date1.getDate(),
    date1.getHours(),
    date1.getMinutes(),
  )
  const date2utc = Date.UTC(
    date2.getFullYear(),
    date2.getMonth(),
    date2.getDate(),
    date2.getHours(),
    date2.getMinutes(),
  )
  var year = 1000 * 60 * 60 * 24 * 30 * 12
  var day = 1000 * 60 * 60 * 24
  var hour = 1000 * 60 * 60
  var minute = 1000 * 60

  return {
    year: (date1utc - date2utc) / year,
    day: (date1utc - date2utc) / day,
    hour: (date1utc - date2utc) / hour,
    minute: (date1utc - date2utc) / minute,
  }
}
