import {renderHeadingOne} from './renderHeadingOne'
import {renderHeadingTwo} from './renderHeadingTwo'
import {renderHeadingThree} from './renderHeadingThree'
import {renderBlockquote} from './renderBlockquote'
import {renderUnorderedList} from './renderUnorderedList'
import {renderOrderedList} from './renderOrderedList'
import {renderLink} from './renderLink'
import {renderListItem} from './renderListItem'
import {renderCodeBlockElement} from './renderCodeBlockElement'
import {renderImageBlock} from './renderImageBlock'

export const renderElements = [
  renderHeadingOne(),
  renderHeadingTwo(),
  renderHeadingThree(),
  renderBlockquote(),
  renderUnorderedList(),
  renderOrderedList(),
  renderListItem(),
  renderLink(),
  renderCodeBlockElement(),
  renderImageBlock(),
]
