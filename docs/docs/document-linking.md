# Linking


HyperDocs links, prefixed with `hm://`, take the following form:

```
hm://d/DOCUMENT_ID?v=VERSION_REF#BLOCK_REF
```

### Entity References

The following portion is required:

- `hm://` - the HyperDocs URL scheme
- `d/` - the Entity Type ID
- `DOCUMENT_ID` - the ID of the Document to reference

### Entity Type ID

The following are valid entity type identifiers

- `d` - Document Entity
- `a` - Account Entity

Additional types and conventions are reserved for future use

### Version References

A link with only `hm://d/DOCUMENT_ID` is valid, but the entity may change over time. To link to the **exact version** of an Entity, include:

- `?v=` - optional query parameter designating the version ref
- `VERSION_REF` - the CID(s) of the EntityChange that represent an exact version of the Entity, separated by periods (`.`)

### Block References

When you link to [Document Entities](./document-entity), you may deep-link to a specific block (section) of the document heirarchy. These are identified by block ID, as defined by the [Document Entity](./document-entity).

A block reference points to a specific block within a Entity Reference or a Version Reference.

- `hm://d/DOCUMENT_ID#BLOCK_REF` - Block of Entity Ref
- `hm://d/DOCUMENT_ID?v=VERSION_REF#BLOCK_REF` - Block of Version Ref

A simple `BLOCK_ID` is a valid Block Ref, but it may also include a character range, pointing to a string within a block. This is a Block Range Ref:

```
BLOCK_ID:START:END
```

- `BLOCK_ID` - the block ID of the ref
- `START` - utf8 character point (offset) of the start of the range ref
- `END` - utf8 character point (offset) of the start of the range ref

## Example Links

The following are real example links:

- TODO


## Web Links

> Note: The Seed application uses the emerging ["Aer" protocol](./hyperdocs-aer) to convert HTTPS URLs to `hm://` links automatically under the hood