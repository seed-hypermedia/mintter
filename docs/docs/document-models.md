# Hypermedia Document Models

This document describes all the possible states of the Document model in Hypermedia. Depending on the situation, we need to move from one model to another to display/interact properly with both UI and the Backend API.

## Models

1. **Backend Primary model**: This is the model in which the backend will return publications and documents.
2. **Backend Change model**: This is the model in which the Client sends document changes to the backend. this changes are expressed as operations and is important for the CRDT part of the backend.
3. **Editor model**: This is the model that the Client Editor understand and enable interaction with the user. this model is constraint to what the current editor library of the client can handle.
4. **Static model**: this is the model that the client uses to render any Publication or fragment (blocks) on any part of the client (Publication page, excerpts, embeds, conversations, citations, hover cards.). Anything that needs to render Published data will use this model.

### Backend Primary model

this model is defined by the protobuf the backend API follows.

### Backend Change model

this model is defined by the protobuf the backend API follows.

### Editor model

this model is defined by what the Editor can handle

### Static model

this model is defined as an enhanced version of the Backend Primary model. this is true because we want as little transformation as possible between the Backend Primary model and this one to make the transition faster and safer.

## Model Transformations

- for drafts:
  - to render a draft: `Backend Primary -> Editor`
  - to safe a draft to the backend: `Editor -> Backend Change`
  
- for publications:
  - to render a publication: `Backend Primary -> Static`
  ****- to select text on a publication: `Static -> Backend Backend Primary`


---

```
I need to create a function that converts one object into another: heres input object:

{
    id: 'foo',
    text: 'Hello world this is an example',
    annotations: [{
        type: 'emphasis',
        attributes: {},
        starts: [0, 12],
        ends: [11, 16]
    }, {
        type: 'strong',
        attributes: {},
        starts: [6, 20],
        ends: [11, 22]
    }, {
        type: 'link',
        attributes: {
            url: 'https://mintter.com',
        },
        starts: [23],
        ends: [30]
    }, {
        type: 'underline',
        attributes: {},
        starts: [26],
        end: [30]
    }]
}

and this is the output object:

{
    id: 'foo',
    content: [{
        type: 'text',
        text: 'Hello ',
        styles: {
            emphasis: true,
        }
    }, {
        type: 'text',
        text: 'world'
        styles: {
            emphasis: true,
            strong: true,
        }
    }, {
        type: 'text',
        text: ' ',
        styles: {}
    }, {
        type: 'text',
        text: 'this',
        styles: {
            emphasis: true
        }
    }, {
        type: 'text',
        text: ' is ',
        styles: {}
    },{
        type: 'text',
        text: 'an',
        styles: {
            strong: true,
        }
    }, {
        type: 'text',
        text: ' ',
        styles: {}
    },
    {
        type: 'link',
        href: 'https://mintter.com',
        children: [{
            type: 'text',
            text: 'exa',
            styles: {}
        },
        {
            type: 'text',
            text: 'mple',
            styles: {
                underline: true,
            }
        }]
    }]
}


some things that you need to know:

- the numbers in the values "starts" and "ends" in the "annotations" represent the character index of the attribute "text" in the input object
- the annotations are grouped by type. there should not be more than one annotation with the same time in the annotations list

```