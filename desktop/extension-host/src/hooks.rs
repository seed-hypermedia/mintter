use std::{fmt::Display, str::FromStr};

use crate::Error;

pub mod menu;
pub mod render_element;
pub mod render_leaf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[repr(u32)]
pub enum Hook {
    Metadata = 0,
    Menu = 1,
    RenderElement = 2,
    RenderLeaf = 3,
}

impl FromStr for Hook {
    type Err = Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Metadata" | "metadata" => Ok(Self::Metadata),
            "Menu" | "menu" => Ok(Self::Menu),
            "RenderElement" | "render_element" => Ok(Self::RenderElement),
            "RenderLeaf" | "render_leaf" => Ok(Self::RenderLeaf),
            _ => Err(Error::UnknownHook(s.to_string())),
        }
    }
}

impl Display for Hook {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Hook::Metadata => write!(f, "metadata"),
            Hook::Menu => write!(f, "menu"),
            Hook::RenderElement => write!(f, "render_element"),
            Hook::RenderLeaf => write!(f, "render_leaf"),
        }
    }
}
