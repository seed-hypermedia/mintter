# Mintter sites

## development

in order to test sites locally we need:

- the mintter app running
- a mintter account
- the site code running
- a local backend running for the site

### Setup

All scripts should be run from the root of the repo, no need to run them in
separate directories:

1. **Terminal 1: Desktop App**
   ```shell
   ./dev run-desktop
   ```
1. **Terminal 2: Site Backend**

   ```shell
   ./dev run-backend -site.hostname "http://127.0.0.1:56100" --http.port 56001 -grpc.port 56002 -p2p.port 56000 -data-dir ~/.mtt-site -site.owner-id <ACCOUNT_ID> -site.title testsite -identity.no-account-wait -syncing.disabled
   ```

   > (make sure to replace `<ACCOUNT_ID>` with your desktop app's account ID)

1. **Terminal 3: Site App**
   ```shell
   GRPC_HOST="http://localhost:56001/" PORT=56100 HM_BASE_URL="http://127.0.0.1:56100/" yarn site
   ```
