pub use anyhow::{Context, Error};

#[derive(Debug, thiserror::Error)]
pub enum ErrorKind {
  /// Errno::Ilseq: Illegal byte sequence
  #[error("Ilseq: Illegal byte sequence")]
  Ilseq,
  /// Errno::Inval: Invalid argument
  #[error("Inval: Invalid argument")]
  Inval,
  /// Errno::Overflow: Value too large to be stored in data type.
  #[error("Overflow: Value too large to be stored in data type")]
  Overflow,
  /// Errno::Io: I/O error
  #[error("Io: I/O error")]
  Io,
}

pub trait ErrorExt {
  fn trap(msg: impl Into<String>) -> Self;
  fn invalid_argument() -> Self;
  fn overflow() -> Self;
  fn io() -> Self;
  fn illegal_byte_sequence() -> Self;
}

impl ErrorExt for Error {
  fn trap(msg: impl Into<String>) -> Self {
    anyhow::anyhow!(msg.into())
  }
  fn invalid_argument() -> Self {
    ErrorKind::Inval.into()
  }
  fn overflow() -> Self {
    ErrorKind::Overflow.into()
  }
  fn io() -> Self {
    ErrorKind::Io.into()
  }
  fn illegal_byte_sequence() -> Self {
    ErrorKind::Ilseq.into()
  }
}
