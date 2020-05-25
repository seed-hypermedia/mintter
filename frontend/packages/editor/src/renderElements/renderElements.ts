import {renderHeadingOne} from './renderHeadingOne'
import {renderHeadingTwo} from './renderHeadingTwo'
import {renderHeadingThree} from './renderHeadingThree'
import {renderBlockquote} from './renderBlockquote'
import {renderUnorderedList} from './renderUnorderedList'
import {renderOrderedList} from './renderOrderedList'
import {renderLink} from './renderLink'
import {renderListItem} from './renderListItem'
import {renderParagraph} from './renderParagraph'
import {renderSectionElement} from '../SectionPlugin'

export const renderElements = [
  renderSectionElement(),
  renderHeadingOne(),
  renderHeadingTwo(),
  renderHeadingThree(),
  renderBlockquote(),
  renderUnorderedList(),
  renderOrderedList(),
  renderListItem(),
  renderLink(),
  renderParagraph(),
]
