use semver::{Version, VersionReq};
use serde::{Deserialize, Serialize};
use tracing::warn;
use wasmparser::{Parser, Payload};

#[derive(Debug, Serialize, Deserialize)]
pub struct Metadata {
  name: String,
  description: String,
  version: Version,
  mintter_version: Option<VersionReq>,
}

impl Default for Metadata {
  fn default() -> Self {
    warn!("Metadata parsing failed, using default metadata...");

    Self {
      name: "unknown".to_string(),
      description: "".to_string(),
      version: Version::new(0, 0, 0),
      mintter_version: None,
    }
  }
}

impl Metadata {
  pub fn name(&self) -> &str {
    &self.name
  }

  pub fn version(&self) -> &Version {
    &self.version
  }

  pub fn parse(bytes: &[u8]) -> crate::Result<Self> {
    Ok(
      Parser::new(0)
        .parse_all(bytes)
        .find_map(|payload| -> Option<Metadata> {
          match payload.ok()? {
            Payload::CustomSection(section) if section.name() == "mtt_meta" => {
              serde_json::from_slice(section.data()).ok()
            }
            _ => None,
          }
        })
        .unwrap_or_default(),
    )
  }
}
