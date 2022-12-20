import {PropsWithChildren, useRef} from 'react'
import {useSlatePresentation} from '.'
import {Paragraph as ParagraphType} from '../mttast'
import {clsx} from 'clsx'

export function Paragraph({element, ...props}: ParagraphProps) {
  let ref = useRef<HTMLParagraphElement>(null)
  let {type} = useSlatePresentation()

  return (
    <p
      ref={ref}
      className={clsx({inline: type == 'transclusion'})}
      {...props}
    />
  )
}

type ParagraphProps = PropsWithChildren<{element: ParagraphType}>
