use crate::{
  error::{Error, ErrorKind},
  MttCtx,
};
use tauri::Runtime;
use tracing::debug;

wiggle::from_witx!({
    witx: ["$WASI_ROOT/mtt_ephemeral_poll.witx"],
    errors: { mtt_errno => Error },
    async: *
});

impl<R: Runtime> types::UserErrorConversion for MttCtx<R> {
  fn mtt_errno_from_error(&mut self, e: Error) -> Result<types::MttErrno, wiggle::Trap> {
    debug!("Error: {:?}", e);
    e.try_into()
      .map_err(|e| wiggle::Trap::String(format!("{:?}", e)))
  }
}

impl TryFrom<Error> for types::MttErrno {
  type Error = Error;
  fn try_from(e: Error) -> Result<types::MttErrno, Error> {
    use types::MttErrno;
    if e.is::<ErrorKind>() {
      let e = e.downcast::<ErrorKind>().unwrap();
      Ok(e.into())
    } else if e.is::<std::io::Error>() {
      let e = e.downcast::<std::io::Error>().unwrap();
      e.try_into()
    } else if e.is::<wiggle::GuestError>() {
      let e = e.downcast::<wiggle::GuestError>().unwrap();
      Ok(e.into())
    } else if e.is::<std::num::TryFromIntError>() {
      Ok(MttErrno::Overflow)
    } else if e.is::<std::str::Utf8Error>() {
      Ok(MttErrno::Ilseq)
    } else {
      Err(e)
    }
  }
}

impl From<ErrorKind> for types::MttErrno {
  fn from(e: ErrorKind) -> types::MttErrno {
    use types::MttErrno;
    match e {
      ErrorKind::Ilseq => MttErrno::Ilseq,
      ErrorKind::Inval => MttErrno::Inval,
      ErrorKind::Overflow => MttErrno::Overflow,
      ErrorKind::Io => MttErrno::Io,
    }
  }
}

impl From<wiggle::GuestError> for types::MttErrno {
  fn from(err: wiggle::GuestError) -> Self {
    use wiggle::GuestError::*;
    match err {
      InvalidFlagValue { .. } => Self::Inval,
      InvalidEnumValue { .. } => Self::Inval,
      PtrOverflow { .. } => Self::Fault,
      PtrOutOfBounds { .. } => Self::Fault,
      PtrNotAligned { .. } => Self::Inval,
      PtrBorrowed { .. } => Self::Fault,
      InvalidUtf8 { .. } => Self::Ilseq,
      TryFromIntError { .. } => Self::Overflow,
      InFunc { err, .. } => types::MttErrno::from(*err),
      SliceLengthsDiffer { .. } => Self::Fault,
      BorrowCheckerOutOfHandles { .. } => Self::Fault,
    }
  }
}

impl TryFrom<std::io::Error> for types::MttErrno {
  type Error = Error;
  fn try_from(err: std::io::Error) -> Result<types::MttErrno, Error> {
    match err.kind() {
      std::io::ErrorKind::InvalidInput => Ok(types::MttErrno::Ilseq),
      _ => Err(anyhow::anyhow!(err).context("Unknown OS error".to_string())),
    }
  }
}

impl wiggle::GuestErrorType for types::MttErrno {
  fn success() -> Self {
    Self::Success
  }
}
