import {ReactEditor} from 'slate-react'

export function withHelper() {
  return <T extends ReactEditor>(editor: T) => {
    return editor
  }
}
