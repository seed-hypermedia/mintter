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
  /// Errno::Badf: Bad file descriptor
  #[error("Badf: Bad file descriptor")]
  Badf,
  /// Errno::Perm: Permission denied
  #[error("Permission denied")]
  Perm,
}

pub trait ErrorExt {
  fn trap(msg: impl Into<String>) -> Self;
  fn badf() -> Self;
  fn perm() -> Self;
}

impl ErrorExt for Error {
  fn trap(msg: impl Into<String>) -> Self {
    anyhow::anyhow!(msg.into())
  }
  fn badf() -> Self {
    ErrorKind::Badf.into()
  }
  fn perm() -> Self {
    ErrorKind::Perm.into()
  }
}
