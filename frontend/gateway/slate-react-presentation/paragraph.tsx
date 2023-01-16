import {clsx} from 'clsx'
import {getHighlighter} from 'shiki-es'
import {PropsWithChildren, useRef, useEffect, useState} from 'react'
import {assign, createMachine} from 'xstate'
import {useMachine, useSelector} from '@xstate/react'
import {useSlatePresentation} from '.'
import {Paragraph as ParagraphType} from '@mintter/mttast'
import {Node} from 'slate'

export function Paragraph({element, ...props}: ParagraphProps) {
  let ref = useRef<HTMLParagraphElement>(null)
  let {type} = useSlatePresentation()
  let [state, send, service] = useMachine(() => paragraphMachine)
  let parentType = useSelector(
    service,
    (state) => state.context.parentRef?.dataset.type,
  )

  useEffect(() => {
    if (ref.current) {
      send({type: 'REF', ref: ref.current})
    }
  }, [ref.current])

  if (state.matches('error')) {
    throw Error(`paragraph error: ${state.context.errorMessage}`)
  }

  if (state.matches('ready')) {
    if (parentType == 'blockquote') {
      return <blockquote {...props} />
    }

    if (parentType == 'code') {
      return (
        <Codeblock
          {...props}
          lang={state.context.parentRef.lang}
          element={element}
        />
      )
    }

    return <p className={clsx({inline: type == 'transclusion'})} {...props} />
  }

  return <span ref={ref}></span>
}

type ParagraphProps = PropsWithChildren<{element: ParagraphType}>

let paragraphMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5SwC4EMUEsDGAFNATmlEQA4AWAtALZrbmYB2YAdPWNgNZNQAEphMIxQBiAQSEoA2gAYAuolCkA9rExZljRSAAeiSgEYArEZYAOAGwAmGQbNH7NozLMAaEAE9ED80YsAWfyMAZgMrIwBfCPdUDBx8IhI0Cho6BmY2cg5uRj4AGzAANzA8kQLivNkFJBAVNQ0tGr0EAwtgln8Adk7g8P9ggE4g0Kt3LwRg9v8Aq2sHYwsTAajokEZlCDhtWKw8QmIyKlp6JjBtOvVMTW1myht2yxs7ByMnFzH9AxcWGU6LMyswRk-is-VeViiMXQuwSB2SRzSp0y2R4-EEwnOqku1yanwMAw6-jMwOCAN6IPxHwQdxkLCMAwMBi6gJkFgsf0CkJAO3i+ySKWO6VYEjQEHGSixDRuiE6Zjps06MisZmJ9gGpKpNLpDKZnRZbI5-i5PL2iUOqROGXYXFR5RKmPqV0aoFugJY7JVbVeIQGrPCVMsLAGlkZQVsAxCYRWESAA */
  createMachine(
    {
      initial: 'idle',
      states: {
        idle: {
          on: {
            REF: {
              target: 'getting parent',
              actions: ['assignRef'],
            },
          },
        },
        'getting parent': {
          invoke: {
            src: 'getParent',
            onDone: {
              target: 'ready',
              actions: ['assignParent'],
            },
            onError: {
              target: 'error',
              actions: ['assignError'],
            },
          },
        },
        ready: {},
        error: {},
      },
      id: 'paragraph-machine',
      tsTypes: {} as import('./paragraph.typegen').Typegen0,
      context: {
        errorMessage: '',
      },
      schema: {
        events: {} as ParagraphMachineEvent,
        context: {} as ParagraphMachineContext,
        services: {} as ParagraphMachineServices,
      },
      predictableActionArguments: true,
    },
    {
      actions: {
        assignRef: assign({
          currentRef: (c, event) => {
            return event.ref
          },
        }),
        assignParent: assign({
          parentRef: (c, event) => event.data,
        }),
        assignError: assign({
          errorMessage: (c, event) => {
            return JSON.stringify(event.data)
          },
        }),
      },
      services: {
        getParent: (context) =>
          new Promise((res, rej) => {
            let parent = (context.currentRef as HTMLParagraphElement).parentNode
            if (parent) {
              res(parent)
            } else {
              rej(`ERROR (staticParagraph-machine): there's no parent?`)
            }
          }),
      },
    },
  )

type ParagraphMachineContext = {
  currentRef?: HTMLElement
  parentRef?: ParentNode
  level?: number
  errorMessage: string
}

type ParagraphMachineEvent = {
  type: 'REF'
  ref: HTMLElement
}

type ParagraphMachineServices = {
  getParent: {
    data: ParentNode
  }
  getLevel: {
    data: number
  }
}

function Codeblock(props: any) {
  let [code, setCode] = useState('')
  useEffect(() => {
    initCode()

    async function initCode() {
      let text = Node.string(props.element)
      const highlighter = await getHighlighter({theme: 'nord'})
      setCode(highlighter.codeToHtml(text, {lang: props.lang || 'js'}))
    }
  }, [])

  if (code) {
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: code,
        }}
      />
    )
  }

  return (
    <pre className="shiki">
      <code>...</code>
    </pre>
  )
}
