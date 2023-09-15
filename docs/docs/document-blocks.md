# Document Block Types

A block is a section of a document. Depending on the type of the block, it may have children.

## Text | Video | Image | File


## GroupingContent

May have any children blocks

### Group

### OrderedList


### UnorderedList

## FlowContent

May have PhrasingContent blocks as children

### Statement
### Heading
### Blockquote
### Code

## PhrasingContent

`Link | Embed`

### Text

```
export interface Text extends Literal {
  type: 'text'
  strong?: boolean
  emphasis?: boolean
  underline?: boolean
  strikethrough?: boolean
  superscript?: boolean
  subscript?: boolean
  code?: boolean
  color?: string
  // implementation relevant marks. not persistent
  codeToken?: string
  'find-highlight'?: boolean
  conversations?: Array<string>
}

```

### Video

### Image

### File

```
{
    type: 'file'
    name?: string
    title?: string
    defaultOpen
    children: [???]
}
```

> Note: why is "file" a Parent?

> Note: what is the difference between title and name?

> Note: what is defaultOpen




# References

- mttast/types
