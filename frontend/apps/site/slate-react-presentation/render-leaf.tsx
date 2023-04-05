import {useCallback} from 'react'
import {RenderLeafProps} from 'slate-react'

export function useRenderLeaf() {
  return useCallback(({children, leaf}: RenderLeafProps) => {
    if (leaf.strong) {
      children = <b>{children}</b>
    }

    if (leaf.emphasis) {
      children = <i>{children}</i>
    }

    if (leaf.underline) {
      children = <u>{children}</u>
    }

    if (leaf.strikethrough) {
      children = <s>{children}</s>
    }

    if (leaf.superscript) {
      children = <sup>{children}</sup>
    }

    if (leaf.subrscript) {
      children = <sub>{children}</sub>
    }

    if (leaf.code) {
      children = <code>{children}</code>
    }

    if (leaf.color) {
      children = <span style={{color: leaf.color}}>{children}</span>
    }

    return <span>{children}</span>
  }, [])
}
