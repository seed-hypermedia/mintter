use super::pledge::contains;
use crate::{ctx::Table, Context, Error, ErrorKind, Promises};
use std::time::Duration;
use tauri::{
  api::http::{Body, HttpRequestBuilder, ResponseType},
  http::Response,
  Runtime,
};
use wit_bindgen_host_wasmtime_rust::Result as HostResult;

wit_bindgen_host_wasmtime_rust::generate!({
  tracing: true,
  async: true,
  import: "./wit/fetch.wit",
  name: "fetch",
});

impl From<ErrorKind> for fetch::Error {
  fn from(e: ErrorKind) -> fetch::Error {
    match e {
      ErrorKind::Ilseq => fetch::Error::Ilseq,
      ErrorKind::Inval => fetch::Error::Inval,
      ErrorKind::Overflow => fetch::Error::Overflow,
      ErrorKind::Io => fetch::Error::Io,
      ErrorKind::Badf => fetch::Error::Badf,
      ErrorKind::Perm => fetch::Error::Perm,
    }
  }
}

impl TryFrom<Error> for fetch::Error {
  type Error = Error;
  fn try_from(e: Error) -> Result<fetch::Error, Error> {
    if e.is::<ErrorKind>() {
      let e = e.downcast::<ErrorKind>().unwrap();
      Ok(e.into())
    } else if e.is::<std::io::Error>() {
      Ok(fetch::Error::Io)
    } else if e.is::<std::num::TryFromIntError>() {
      Ok(fetch::Error::Overflow)
    } else if e.is::<std::str::Utf8Error>() {
      Ok(fetch::Error::Ilseq)
    } else {
      Err(e)
    }
  }
}

#[wit_bindgen_host_wasmtime_rust::async_trait]
impl<R: Runtime> fetch::Fetch for Context<R> {
  async fn fetch(
    &mut self,
    url: String,
    opts: std::option::Option<fetch::FetchOptions>,
  ) -> HostResult<u32, fetch::Error> {
    if !contains(self.promises, Promises::FETCH) {
      Err(fetch::Error::Perm)?
    }

    fetch_inner(&mut self.resource_table, url, opts)
      .await
      .map_err(Into::into)
  }

  async fn body(&mut self, response: fetch::Response) -> anyhow::Result<Vec<u8>> {
    if !contains(self.promises, Promises::FETCH) {
      Err(fetch::Error::Perm)?
    }

    Ok(
      self
        .resource_table
        .get::<Response>(response)?
        .body()
        .to_vec(),
    )
  }

  async fn headers(&mut self, response: fetch::Response) -> anyhow::Result<Vec<(String, String)>> {
    if !contains(self.promises, Promises::FETCH) {
      Err(fetch::Error::Perm)?
    }

    let headers = self.resource_table.get::<Response>(response)?.headers();

    let mut out = vec![];
    for (key, value) in headers.iter() {
      out.push((
        key.to_string(),
        value.to_str().map_err(|_| fetch::Error::Ilseq)?.to_string(),
      ));
    }

    Ok(out)
  }

  async fn ok(&mut self, response: fetch::Response) -> anyhow::Result<bool> {
    if !contains(self.promises, Promises::FETCH) {
      Err(fetch::Error::Perm)?
    }

    Ok(
      self
        .resource_table
        .get::<Response>(response)?
        .status()
        .is_success(),
    )
  }

  async fn redirected(&mut self, response: fetch::Response) -> anyhow::Result<bool> {
    if !contains(self.promises, Promises::FETCH) {
      Err(fetch::Error::Perm)?
    }

    Ok(
      self
        .resource_table
        .get::<Response>(response)?
        .status()
        .is_redirection(),
    )
  }

  async fn status(&mut self, response: fetch::Response) -> anyhow::Result<u16> {
    if !contains(self.promises, Promises::FETCH) {
      Err(fetch::Error::Perm)?
    }

    Ok(
      self
        .resource_table
        .get::<Response>(response)?
        .status()
        .as_u16(),
    )
  }

  async fn status_text(&mut self, response: fetch::Response) -> anyhow::Result<String> {
    if !contains(self.promises, Promises::FETCH) {
      Err(fetch::Error::Perm)?
    }
    
    Ok(
      self
        .resource_table
        .get::<Response>(response)?
        .status()
        .to_string(),
    )
  }
}

async fn fetch_inner(
  table: &mut Table,
  url: String,
  opts: std::option::Option<fetch::FetchOptions>,
) -> crate::Result<u32> {
  let mut req = HttpRequestBuilder::new("Get", url)?;

  if let Some(opts) = opts {
    req.method = opts.method;

    if let Some(timeout) = opts.timeout {
      let duration = match timeout {
        fetch::Timeout::Duration(duration) => Duration::new(duration.secs, duration.nanos),
        fetch::Timeout::U64(duration) => Duration::from_millis(duration),
      };

      req = req.timeout(duration);
    }

    if let Some(headers) = &opts.headers {
      for (k, v) in headers {
        req = req.header(k, v)?;
      }
    }

    if let Some(query) = opts.query {
      req = req.query(query.into_iter().collect());
    }

    if let Some(response_type) = &opts.response_type {
      let response_type = match response_type {
        fetch::ResponseType::Json => ResponseType::Json,
        fetch::ResponseType::Text => ResponseType::Text,
        fetch::ResponseType::Binary => ResponseType::Binary,
      };

      req = req.response_type(response_type);
    }

    if let Some(body) = opts.body {
      req = req.body(Body::Bytes(body));
    }
  }

  let client = tauri::api::http::ClientBuilder::default().build()?;

  let response = client.send(req).await?;

  table.push(Box::new(response))
}
