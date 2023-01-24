export function PublicationPlaceholder() {
  return (
    <>
      <div className="placeholder title" style={{maxWidth: '60%'}} />
      <div className="placeholder title" style={{maxWidth: '45%'}} />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </>
  )
}

function BlockPlaceholder() {
  return (
    <div className="block-placeholder">
      <div className="placeholder" style={{maxWidth: '90%'}} />
      <div className="placeholder" />
      <div className="placeholder" style={{maxWidth: '75%'}} />
      <div className="placeholder" style={{maxWidth: '60%'}} />
    </div>
  )
}
