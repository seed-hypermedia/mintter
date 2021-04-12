import { createHyperscript } from 'slate-hyperscript';
import { options } from '../src/editor/options';
import { createText } from './hyperscript/creators';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any;
      editor: any;
      inline: any;
      htext: any;
    }
  }
}

export const jsx = createHyperscript({
  elements: {
    hp: { type: options.p.type },
    // hblockquote: {type: options.blockquote.type},
    hcode: { type: options.code.type },
    // ha: {type: options.link.type},
    // hul: {type: options.ul.type},
    // hol: {type: options.ol.type},
    // hli: {type: options.li.type},
    // hh1: {type: options.h1.type},
    // hh2: {type: options.h2.type},
    // hh3: {type: options.h3.type},
    inline: { inline: true },
    block: { type: options.block.type },
    blockList: { type: options.block_list.type },
  },
  creators: {
    htext: createText,
  },
});
