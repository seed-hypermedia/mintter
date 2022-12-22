import {useMachine} from '@xstate/react'
import {useEffect, useRef} from 'react'
import {assign, createMachine} from 'xstate'

export function StaticParagraph(props) {
  let ref = useRef<HTMLSpanElement>()
  let [state, send] = useMachine(() => staticParagraphMachine)

  useEffect(() => {
    if (ref.current) {
      send({type: 'REF', ref: ref.current})
    }
  }, [ref.current])

  if (state.matches('error')) {
    throw Error(`static paragraph error: ${state.context.errorMessage}`)
  }

  let Elem = headingLevel[state.context.level]

  return (
    <span ref={ref}>
      {state.matches('ready') ? <Elem {...props} /> : '...'}
    </span>
  )
}

let staticParagraphMachine =
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
              target: 'getting level',
              actions: ['assignParent'],
            },
            onError: {
              target: 'error',
              actions: ['assignError'],
            },
          },
        },
        'getting level': {
          invoke: {
            src: 'getLevel',
            onDone: {
              target: 'ready',
              actions: ['assignLevel'],
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
      id: 'staticParagraph-machine',
      tsTypes: {} as import('./static-paragraph.typegen').Typegen0,
      context: {
        errorMessage: '',
      },
      schema: {
        events: {} as StaticParagraphMachineEvent,
        context: {} as StaticParagraphMachineContext,
        services: {} as StaticParagraphMachineServices,
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
        assignLevel: assign({
          level: (c, event) => event.data,
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
        getLevel: (context) =>
          new Promise((res, rej) => {
            let level = context.parentRef?.dataset.level

            if (level) {
              res(parseInt(level))
            } else {
              rej(`ERROR (staticParagraph-machine): there's no level?`)
            }
          }),
      },
    },
  )

type StaticParagraphMachineContext = {
  currentRef?: HTMLElement
  parentRef?: ParentNode
  level?: number
  errorMessage: string
}

type StaticParagraphMachineEvent = {
  type: 'REF'
  ref: HTMLElement
}

type StaticParagraphMachineServices = {
  getParent: {
    data: ParentNode
  }
  getLevel: {
    data: number
  }
}

var headingLevel = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
}
