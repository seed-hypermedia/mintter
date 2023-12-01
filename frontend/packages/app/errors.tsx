import * as Sentry from '@sentry/electron'
import {toast} from 'react-hot-toast'

export default function appError(message: string, metadata?: any) {
  toast.error(message)
  // TODO: check that I can send metadata this way

  Sentry.captureException(metadata.error || new Error(message, metadata))
  console.error('📣 🚨', message, metadata)
}
