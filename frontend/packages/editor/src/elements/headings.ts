import {renderElement} from '../components/styledElement'

// type HeadingKeyOption = 'h1' | 'h2' | 'h3'

export const ELEMENT_H1 = 'h1'
export const ELEMENT_H2 = 'h2'
export const ELEMENT_H3 = 'h3'

export const HEADING_OPTIONS = {
  h1: {
    component: renderElement({type: ELEMENT_H1}),
    type: ELEMENT_H1,
    rootProps: {
      className: 'text-4xl text-heading my-4 leading-normal',
      as: 'h1',
    },
  },
  h2: {
    component: renderElement({type: ELEMENT_H2}),
    type: ELEMENT_H2,
    rootProps: {
      className: 'text-3xl text-heading my-6',
      as: 'h2',
    },
  },
  h3: {
    component: renderElement({type: ELEMENT_H3}),
    type: ELEMENT_H3,
    rootProps: {
      className: 'text-2xl text-heading my-6',
      as: 'h3',
    },
  },
}
