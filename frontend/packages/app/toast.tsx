import {Renderable, toast as realToast} from 'react-hot-toast'

type ToastOpts = Parameters<typeof realToast>[1] & {
  onClick?: () => void
}

function wrapClickable(message: string | Renderable, onClick?: () => void) {
  if (!onClick) return message
  return (
    <span onClick={onClick} style={{cursor: 'pointer'}}>
      {message}
    </span>
  )
}

export function toast(message: string | Renderable, opts?: ToastOpts) {
  const {onClick, ...toastOpts} = opts || {}
  realToast(wrapClickable(message, onClick), {...toastOpts})
}

Object.keys(realToast).forEach((key) => {
  // @ts-ignore
  toast[key] = realToast[key]
})

toast.error = (message: string | Renderable, opts?: ToastOpts) => {
  const {onClick, ...toastOpts} = opts || {}
  realToast.error(wrapClickable(message, onClick), {...toastOpts})
}

toast.success = (message: string | Renderable, opts?: ToastOpts) => {
  const {onClick, ...toastOpts} = opts || {}
  realToast.success(wrapClickable(message, onClick), {...toastOpts})
}

toast.promise = (
  promise: Promise<void>,
  messages: {
    error: string | Renderable
    loading: string | Renderable
    success: string | Renderable
  },
  opts?: ToastOpts,
) => {
  const {onClick, ...toastOpts} = opts || {}
  realToast.promise(
    promise,
    {
      error: wrapClickable(messages.error, onClick),
      loading: wrapClickable(messages.loading, onClick),
      success: wrapClickable(messages.success, onClick),
    },
    {...toastOpts},
  )
}
