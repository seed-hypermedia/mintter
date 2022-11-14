use crate::{Context, Error, ErrorExt, ErrorKind};
use tauri::Runtime;

wit_bindgen_host_wasmtime_rust::generate!({
    tracing: true,
    import: "./wit/pledge.wit",
    name: "pledge",
});

impl From<ErrorKind> for pledge::Error {
  fn from(e: ErrorKind) -> pledge::Error {
    match e {
      ErrorKind::Ilseq => pledge::Error::Ilseq,
      ErrorKind::Inval => pledge::Error::Inval,
      ErrorKind::Overflow => pledge::Error::Overflow,
      ErrorKind::Io => pledge::Error::Io,
      ErrorKind::Badf => pledge::Error::Badf,
      ErrorKind::Perm => pledge::Error::Perm,
    }
  }
}

impl TryFrom<Error> for pledge::Error {
  type Error = Error;
  fn try_from(e: Error) -> Result<pledge::Error, Error> {
    if e.is::<ErrorKind>() {
      let e = e.downcast::<ErrorKind>().unwrap();
      Ok(e.into())
    } else if e.is::<std::io::Error>() {
      Ok(pledge::Error::Io)
    } else if e.is::<std::num::TryFromIntError>() {
      Ok(pledge::Error::Overflow)
    } else if e.is::<std::str::Utf8Error>() {
      Ok(pledge::Error::Ilseq)
    } else {
      Err(e)
    }
  }
}

/// Wether a contains all flags in b
// This is used to ensure the caller can only downgrade permissions, but never increase them
fn contains(a: pledge::Promises, b: pledge::Promises) -> bool {
  let [a] = a.as_array();
  let [b] = b.as_array();

  (a & b) == b
}

impl<R: Runtime> pledge::Pledge for Context<R> {
  fn pledge(
    &mut self,
    promises: pledge::Promises,
  ) -> wit_bindgen_host_wasmtime_rust::Result<(), pledge::Error> {
    if !contains(self.promises, promises) {
      Err(Error::perm().context("attempted to escalate privileges"))?;
    }

    self.promises = promises;

    Ok(())
  }
}
