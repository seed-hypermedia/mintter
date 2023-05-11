import {toast as realToast} from 'react-hot-toast'

type ToastOpts = Parameters<typeof realToast>[1] & {
  onClick?: () => void
}
function wrapClickable(message: string, onClick?: () => void) {
  if (!onClick) return message
  return (
    <span onClick={onClick} style={{cursor: 'pointer'}}>
      {message}
    </span>
  )
}

export function toast(message: string, opts?: ToastOpts) {
  const {onClick, ...toastOpts} = opts || {}
  realToast(wrapClickable(message, onClick), {...toastOpts})
}

Object.keys(realToast).forEach((key) => {
  // @ts-ignore
  toast[key] = realToast[key]
})

toast.error = (message: string, opts?: ToastOpts) => {
  const {onClick, ...toastOpts} = opts || {}
  realToast.error(wrapClickable(message, onClick), {...toastOpts})
}

toast.success = (message: string, opts?: ToastOpts) => {
  const {onClick, ...toastOpts} = opts || {}
  realToast.success(wrapClickable(message, onClick), {...toastOpts})
}
