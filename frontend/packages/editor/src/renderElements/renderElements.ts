import {renderBlockquote} from './renderBlockquote'
import {renderUnorderedList} from './renderUnorderedList'
import {renderOrderedList} from './renderOrderedList'
import {renderLink} from './renderLink'
import {renderListItem} from './renderListItem'
import {renderCodeBlockElement} from './renderCodeBlockElement'
import {renderImageBlock} from './renderImageBlock'

export const renderElements = [
  renderBlockquote(),
  renderUnorderedList(),
  renderOrderedList(),
  renderListItem(),
  renderLink(),
  renderCodeBlockElement(),
  renderImageBlock(),
]
