/**
 * from:
 * block-1
 *   block-2
 *     block-3
 *     block-4
 *     block-5
 *
 * const startDepth = [
 *   ['block-1', [
 *     ['block-2', [
 *       ['block-3'],
 *       ['block-4'],
 *       ['block-5']
 *     ]]
 *   ]]
 * ]
 *
 * to:
 * block-1
 * block-2
 *   block-3
 *   block-4
 *   block-5
 */

/**
 *
 * @param {string} id
 * @param {[string, any[]]} arr
 * @returns
 */
function getDepth(id, arr) {
  const ids = [...arr].flat()
  let index = 0
  for (let j = 0; j < ids.length; j++) {
    if (ids.includes(id)) break
    if (Array.isArray(ids[j])) {
      // is an array element, we should go down one level
      index = 1 + getDepth(id, ids[j])
    }
  }
  return index
}

function getDepthFast(id, arr, depth = 0) {
  for (current in arr) {
    // `current` is the array index
    const [currentId, children] = arr[current]

    if (children) {
      return getDepthFast(id, children, depth + 1)
    }
    if (currentId === id) {
      return depth
    }
  }
}

const start = [
  ['block-1', [['block-2', [['block-3'], ['block-4']]]]],
  ['block-5'],
]

const end = [['block-1'], ['block-2', [['block-3'], ['block-4']]], ['block-5']]

console.log(getDepthFast('block-5', start))
