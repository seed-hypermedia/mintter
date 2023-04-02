/**
 * Returns back a NodeList of focusable elements
 * that exist within the passed parnt HTMLElement
 * source: https://piccalil.li/tutorial/build-a-fully-responsive-progressively-enhanced-burger-menu/
 *
 * @param {HTMLElement} parent HTML element
 * @returns {NodeList} The focusable elements that we can find
 */
export default function getFocusableElements(
  parent: HTMLElement | ParentNode,
): NodeList | Array<unknown> {
  if (!parent) {
    console.warn('You need to pass a parent HTMLElement')
    return []
  }

  return parent.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), details:not([disabled]), summary:not(:disabled)',
  )
}
