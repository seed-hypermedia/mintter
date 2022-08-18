import {Avatar} from '../avatar'

describe('<Avatar />', () => {
  it('default', () => {
    cy.mount(<Avatar size="3" />)
  })
})
