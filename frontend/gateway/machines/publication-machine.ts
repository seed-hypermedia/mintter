import {assign, createMachine} from 'xstate'
import {Publication} from '../client'
import {blockNodeToSlate} from '../client/v2/block-to-slate'

export const publicationMachine = createMachine({
	context: {
		errorMessage: ""
	},
  initial: 'idle',
  states: {
    idle: {
      always: 'fetching'
    },
    fetching: {
			on: {
				'PUBLICATION.FETCH.SUCCESS': {
					actions: ['setPublication'],
					target: 'transforming'
				}
			}
		},
    transforming: {
			invoke: {
				id: 'transformPublication',
				src: 'transformPublication'
			},
			on: {
				'PUBLICATION.TRANSFORM.SUCCESS': {
					actions: ['setEditorValue'],
					target: 'settled'
				}
			}
		},
    settled: {},
  },
  tsTypes: {} as import('./publication-machine.typegen').Typegen0,
  schema: {
    context: {} as PublicationMachineContext,
    events: {} as PublicationMachineEvent,
  },
	predictableActionArguments: true
}, {
	actions: {
		setPublication: assign({
			publication: (c, event) => event.publication
		}),
		setEditorValue: assign({
			editorValue: (c, event) => event.value
		})
	},
	services: {
		transformPublication: (context, event) => (sendBack) => {
			let value = blockNodeToSlate(context.publication?.document.children, 'group')
			console.log("🚀 ~ file: publication-machine.ts:54 ~ value", value)
		}
	}
})

type PublicationMachineContext = {
	publication?: Publication
	editorValue?: any
	errorMessage: string
}
type PublicationMachineEvent =
  | {type: 'PUBLICATION.FETCH.SUCCESS'; publication: Publication}
	| {type: 'PUBLICATION.FETCH.ERROR'; errorMessage: any}
  | {
      type: 'PUBLICATION.TRANSFORM.SUCCESS'
      value: any
    }
