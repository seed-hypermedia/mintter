import {error} from './logger'
import {toast} from './toast'

export async function copyUrlToClipboardWithFeedback(
  text: string,
  label: string,
) {
  await copyTextToClipboard(text)
    .then(() => {
      toast.success(`${label} Link Copied to Clipboard`)
    })
    .catch((e) => {
      console.error(e)
      toast.error(`${label} Link Failed to Copy`)
    })
}

export function copyTextToClipboard(text: string) {
  return new Promise((resolve, reject) => {
    if (!navigator.clipboard) {
      return fallbackCopyTextToClipboard(text)
    }
    return navigator.clipboard.writeText(text).then(
      () => {
        resolve(text)
      },
      (err) => {
        error('Async: Could not copy text: ', err)
        reject(err)
      },
    )
  })
}

function fallbackCopyTextToClipboard(text: string) {
  return new Promise((resolve, reject) => {
    const textArea = document.createElement('textarea')
    textArea.value = text

    // Avoid scrolling to bottom
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
    } catch (err) {
      error('Fallback: Oops, unable to copy', err)
      reject(err)
    }

    document.body.removeChild(textArea)
    resolve(true)
  })
}
