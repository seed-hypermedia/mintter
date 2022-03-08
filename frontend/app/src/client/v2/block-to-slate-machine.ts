import { assign, createMachine } from "xstate";
import { Layer } from './types';

type BlockToSlateContext = {
  out: any;
  leaf: any;
  textStart: number;
  i: number
  pos: number;
  leafLayers: Set<Layer>
  text: string
}
export const toSlateMachine = createMachine({
  tsTypes: {} as import("./block-to-slate-machine.typegen").Typegen0,
  schema: {
    context: {} as BlockToSlateContext,
  },
  context: {
    out: {
      type: 'statement',
      children: [
        {
          type: 'paragraph',
          children: []
        }
      ]
    },
    text: 'Hello World',
    leaf: null,
    textStart: 0,
    i: 0,
    pos: 0,
    leafLayers: new Set<Layer>()
  },
  initial: 'tick',
  states: {
    tick: {
      entry: 'resetTickValues',
      always: [{
        cond: (context) => context.i > context.text.length,
        target: 'tick',
        actions: ['incrementPos', 'incrementIndex', 'commit']
      }, {
        actions: ['printFinal'],
        target: 'finish'
      }]
    },
    finish: {
      type: 'final'
    }
  }
}, {
  actions: {
    incrementIndex: assign({
      i: (context) => context.i + 1
    }),
    incrementPos: assign({
      pos: (context) => context.pos + 1
    }),
    commit: (context) => {
      console.log('COMMIT: ', context.text);

    },
    printFinal: (context) => {
      console.log('MACHINE FINAL: ');

    },
  }
})