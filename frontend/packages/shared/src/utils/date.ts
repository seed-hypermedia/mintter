import {PlainMessage, Timestamp} from '@bufbuild/protobuf'
import {format, intlFormat} from 'date-fns'
import type {Document} from '../client'

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

export type HMTimestamp = PlainMessage<Timestamp>

const hasRelativeDate =
  typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined'

export function formattedDate(
  value?: string | Date | Timestamp | HMTimestamp | undefined,
  options?: {onlyRelative?: boolean},
) {
  let date = normalizeDate(value)
  if (!date) return ''
  if (hasRelativeDate) {
    // Intl.RelativeTimeFormat is supported
    return relativeFormattedDate(date, options)
    // Use the rtf object for relative time formatting
  } else {
    return date.toLocaleDateString('en', {
      day: '2-digit',
      month: '2-digit',
    })
  }
}

function normalizeDate(
  value: undefined | string | Date | Timestamp | HMTimestamp,
) {
  let date: Date | null = null
  if (typeof value == 'string') {
    date = new Date(value)
  } else if (value instanceof Date) {
    date = value
  } else if (value?.seconds) {
    date = new Date(Number(value.seconds * 1000n))
  }
  return date
}

export function formattedDateLong(
  value?: undefined | string | Date | Timestamp | HMTimestamp,
) {
  let date = normalizeDate(value)
  if (!date) return ''
  return format(date, 'MMMM do yyyy, HH:mm:ss z')
}

export function formattedDateMedium(
  value?: undefined | string | Date | Timestamp | HMTimestamp,
) {
  let date = normalizeDate(value)
  if (!date) return ''
  // if (hasRelativeDate) {
  //   return relativeFormattedDate(date, {onlyRelative: false})
  // }
  return intlFormat(date, {
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    year: 'numeric',
    month: 'long',
  })
  // return `${format(date, 'EEEE, MMMM do, yyyy')}`
}
export function relativeFormattedDate(
  value?: undefined | string | Date | Timestamp | HMTimestamp,
  options?: {onlyRelative?: boolean},
) {
  const onlyRelative = !!options?.onlyRelative
  var now = new Date()
  let date = normalizeDate(value)
  if (!date) return ''
  let formatter = new Intl.RelativeTimeFormat('en-US', {
    style: 'short',
  })

  var result = difference(date, now)

  let relative = 'just now'
  if (result.year < -1) {
    relative = formatter.format(Math.floor(result.year), 'year')
  } else if (result.day < -30) {
    relative = formatter.format(Math.floor(result.day / 30), 'month')
  } else if (result.day < -1) {
    relative = formatter.format(Math.floor(result.day), 'day')
  } else if (result.hour < -1) {
    relative = formatter.format(Math.floor(result.hour), 'hour')
  } else if (result.minute < -2) {
    relative = formatter.format(Math.floor(result.minute), 'minute')
  }

  if (onlyRelative) {
    return relative
  } else if (result.year < -1) {
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
