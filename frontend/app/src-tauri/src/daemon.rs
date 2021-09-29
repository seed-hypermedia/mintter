use log::{error, trace};
use std::sync::Mutex;
use tauri::api::process::{Command, CommandEvent};
use tauri::{
  plugin::{Plugin, Result as PluginResult},
  AppHandle, Invoke, Manager, Runtime,
};
use tokio::sync::mpsc::{self, Sender};

pub struct DaemonPlugin<R: Runtime> {
  invoke_handler: Box<dyn Fn(Invoke<R>) + Send + Sync>,
}

#[derive(Default)]
pub struct Connection(Mutex<Option<Sender<()>>>);

pub fn start_daemon(connection: tauri::State<Connection>) {
  let mut lock = connection.0.lock().unwrap();
  let (tx, mut rx) = mpsc::channel::<()>(1);

  let (mut cx, child) = Command::new_sidecar("mintterd")
    .expect("failed to create `mintterd` binary command")
    .spawn()
    .expect("failed to spawn sidecar");
  tauri::async_runtime::spawn(async move {
    loop {
      tokio::select! {
        _ = rx.recv() => {
            child.kill().unwrap();
            break;
        }
        Some(event) = cx.recv() => {
          match event {
            CommandEvent::Stdout(out) => trace!("daemon {}", out),
            CommandEvent::Stderr(err) | CommandEvent::Error(err) => trace!("daemon error {}", err),
            CommandEvent::Terminated(reason) => {
              match reason.code {
                Some(code) if code == 0 => trace!("daemon terminated"),
                Some(code) => error!("daemon crashed with exit code {}", code),
                None => error!("daemon crashed without exit code")
              }
            },
            _ => {}
          }
        }
      }
    }
  });
  *lock = Some(tx);
}

pub fn stop_daemon(connection: tauri::State<'_, Connection>) {
  let mut lock = connection.0.lock().unwrap();
  *lock = None;
}

impl<R: Runtime> DaemonPlugin<R> {
  // you can add configuration fields here,
  // see https://doc.rust-lang.org/1.0.0/style/ownership/builders.html
  pub fn new() -> Self {
    Self {
      invoke_handler: Box::new(tauri::generate_handler![]),
    }
  }
}

impl<R: Runtime> Plugin<R> for DaemonPlugin<R> {
  /// The plugin name. Must be defined and used on the `invoke` calls.
  fn name(&self) -> &'static str {
    "daemon"
  }

  /// initialize plugin with the config provided on `tauri.conf.json > plugins > $yourPluginName` or the default value.
  fn initialize(&mut self, app: &AppHandle<R>, _: serde_json::Value) -> PluginResult<()> {
    app.manage(Connection(Default::default()));
    Ok(())
  }

  /// Extend the invoke handler.
  fn extend_api(&mut self, message: Invoke<R>) {
    (self.invoke_handler)(message)
  }
}
