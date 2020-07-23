import {renderUnorderedList} from './renderUnorderedList'
import {renderOrderedList} from './renderOrderedList'
import {renderLink} from './renderLink'
import {renderListItem} from './renderListItem'
import {renderCodeBlockElement} from './renderCodeBlockElement'
import {renderImageBlock} from './renderImageBlock'

export const renderElements = [
  renderUnorderedList(),
  renderOrderedList(),
  renderListItem(),
  renderLink(),
  renderCodeBlockElement(),
  renderImageBlock(),
]
