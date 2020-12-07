window.getSelection = function () {
  return {
    addRange: jest.fn(),
    removeAllRanges: jest.fn(),
  }
}
