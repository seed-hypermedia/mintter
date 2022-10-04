use log::{error, info};
use ringbuffer::{ConstGenericRingBuffer, RingBufferExt, RingBufferWrite};
use std::sync::Mutex;
use tauri::{
  api::{
    dialog::blocking::confirm,
    process::{Command, CommandEvent},
  },
  plugin::{Builder as PluginBuilder, TauriPlugin},
  AppHandle, Manager, Runtime,
};
use tokio::sync::mpsc::{self, Sender};

#[tracing::instrument]
pub fn start_daemon<R: Runtime>(
  app_handle: AppHandle<R>,
  connection: tauri::State<Connection>,
  daemon_flags: tauri::State<Flags>,
) {
  let mut lock = connection.0.lock().unwrap();
  let (tx, mut rx) = mpsc::channel::<()>(1);

  let (mut cx, child) = Command::new_sidecar("mintterd")
    .expect("failed to create `mintterd` binary command")
    .args(daemon_flags.inner().0.iter())
    .spawn()
    .expect("failed to spawn sidecar");

  tauri::async_runtime::spawn(async move {
    let mut messages = ConstGenericRingBuffer::<_, 32>::new();

    loop {
      tokio::select! {
        _ = rx.recv() => {
            child.kill().unwrap();
            break;
        }
        Some(event) = cx.recv() => {
          match event {
            CommandEvent::Stdout(out) => {
              info!("{}", out);
              messages.push(out);
            },
            CommandEvent::Stderr(out) => {
              info!("{}", out);
              messages.push(out);
            },
            CommandEvent::Error(err) => {
              error!("{}", err);
              messages.push(err);
            },
            CommandEvent::Terminated(reason) => {
              match reason.code {
                Some(code) if code == 0 => error!("daemon terminated"),
                Some(code) => error!("daemon crashed with exit code {}", code),
                None => error!("daemon crashed without exit code")
              }

              let message = format!("You need to restart the app now. \n Latest 20 logs: \n {}", messages.iter().cloned().collect::<String>());

              if confirm::<R>(None, "The Daemon crashed", message) {
                app_handle.restart();
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

#[tracing::instrument]
pub fn stop_daemon(connection: tauri::State<'_, Connection>) {
  let mut lock = connection.0.lock().unwrap();
  *lock = None;
}

#[derive(Debug, Default)]
pub struct Connection(Mutex<Option<Sender<()>>>);

#[derive(Debug, Default)]
pub struct Flags(pub(crate) Vec<String>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  PluginBuilder::new("daemon")
    .setup(|app_handle| {
      app_handle.manage(Connection::default());

      let mut flags: Vec<String> = std::env::args().skip(1).collect();

      let repo_path = app_handle.path_resolver().app_dir().unwrap();
      flags.push(format!("--repo-path={}", repo_path.as_path().display()));

      app_handle.manage(Flags(flags));
      Ok(())
    })
    .build()
}
