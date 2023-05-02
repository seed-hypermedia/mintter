import {Annotation} from './.generated/documents/v1alpha/documents_pb'

// AnnotationSet wraps multiple annotations in a single structure.
export class AnnotationSet {
  // Map key should be some "identity" for a annotation, which should consist
  // of annotation's type and its attributes in some canonical representation,
  // which should be created deterministically, i.e. same type and attributes,
  // must result in the same annotation ID.
  // In this concrete example I'm using just the type as an ID.
  annotations: Map<string, Annotation>

  constructor() {
    this.annotations = new Map()
  }

  addSpan(
    type: string,
    attributes: {[key: string]: string} | null,
    start: number,
    end: number,
  ) {
    const id = this._annotationID(type, attributes)

    let annotation = this.annotations.get(id)
    if (!annotation) {
      annotation = new Annotation({
        type,
        attributes: attributes ?? {},
        starts: [],
        ends: [],
      })

      this.annotations.set(id, annotation)
    }

    addSpanToAnnotation(annotation, start, end)
  }

  _annotationID(
    type: string,
    attributes: {[key: string]: string} | null,
  ): string {
    // TODO: Here we'd need to create id of a annotation, taking into account the attributes.
    if (attributes && attributes.url) {
      return `${type}-${attributes.url}`
    }

    if (attributes && attributes.conversationId) {
      return `${type}-${attributes.conversationId}`
    }

    if (attributes && attributes.color) {
      return `${type}-${attributes.color}`
    }

    return type
  }

  list(): Annotation[] {
    // We sort annotations by their "identity" key.
    const keys = Array.from(this.annotations.keys()).sort()
    // Then we create an output array of the same size as the number of annotations.
    let out: Annotation[] = new Array(keys.length)
    // Then we add annotations in the proper order.
    for (let i in keys) {
      const annotation = this.annotations.get(keys[i])
      if (annotation) out[i] = annotation
    }

    out = out.sort((a, b) => {
      let startA = a.starts[0]
      let startB = b.starts[0]

      return startA - startB
    })

    return out
  }
}

// Checks if a position expressed in code points is within any of the span
// of this annotation.
// It assumes starts and ends array are valid span values, and are sorted,
// because it's implemented as a binary search.
// It returns array index of the span the position matches.
// Otherwise it returns -1.
export function annotationContains(
  annotation: Annotation,
  pos: number,
): number {
  let low = 0
  let high = annotation.starts.length - 1
  let mid = 0

  while (low <= high) {
    mid = Math.floor((low + high) / 2)
    // Binary search. If the midpoint span ends before the position
    // we're checking — we drop the left side of the array entirely.
    if (annotation.ends[mid] <= pos) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (low == annotation.starts.length) {
    return -1
  }

  if (annotation.starts[low] <= pos && pos < annotation.ends[low]) {
    return low
  }

  return -1
}

export function addSpanToAnnotation(
  annotation: Annotation,
  start: number,
  end: number,
) {
  // We don't need to use any fancy range set data structure here, because we know specifics of our environment,
  // i.e. we know that we'll only ever iterate over the Slate leaves in order, only going forward and never backwards.
  // So, all the possible derived spans will always be sorted.
  // Therefore, to detect adjacent spans, we only need to check the last one and the incoming one.
  if (!annotation.starts) {
    annotation.starts = []
  }

  if (!annotation.ends) {
    annotation.ends = []
  }

  if (annotation.starts.length == 0) {
    pushSpanToAnnotation(annotation, start, end)
    return
  }

  const lastIdx = annotation.starts.length - 1

  // If the incoming span continues the one we already have
  // we just extend the old end until the incoming end,
  // i.e. we merge two spans together.
  if (annotation.ends[lastIdx] == start) {
    annotation.ends[lastIdx] = end
    return
  }

  // Otherwise we just append the span.
  pushSpanToAnnotation(annotation, start, end)
}

export function pushSpanToAnnotation(
  annotation: Annotation,
  start: number,
  end: number,
) {
  annotation.starts.push(start)
  annotation.ends.push(end)
}
