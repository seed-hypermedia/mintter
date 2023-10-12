import {toast} from 'react-hot-toast'

export default function appError(message: string, metadata?: any) {
  toast.error(message)
  console.error('📣 🚨', message, metadata)
}
