import { ELEMENT_PARAGRAPH } from '../elements/defaults';
import { Paragraph } from '../elements/paragraph';

export const ELEMENT_H1 = 'h1';
export const ELEMENT_H2 = 'h2';
export const ELEMENT_H3 = 'h3';
export const ELEMENT_H4 = 'h4';
export const ELEMENT_H5 = 'h5';
export const ELEMENT_H6 = 'h6';

// TODO: fix types
// type HeadingRecords = Record<HeadingKeyOption, HeadingPluginOptionsValues>

const defaults = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].reduce(
  (acc: any, current: string): any => {
    acc[current as string] = {
      component: Paragraph,
      type: ELEMENT_PARAGRAPH,
      rootProps: {
        as: current,
        className: 'font-bold',
      },
    };

    return acc;
  },
  {},
);

export const DEFAULTS_HEADINGS = {
  ...defaults,
  levels: 3,
};
