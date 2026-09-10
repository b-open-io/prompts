# npm-publish

Scripts own every registry command.

`publish.sh --local|--remote` runs `npm whoami`, web-login only if needed, then `bun publish`. bun's default web confirm prints a second URL; the script surfaces it instead of waiting for ENTER.

- `--local` opens browsers on this machine
- `--remote` prints `LOGIN_URL` / `PUBLISH_AUTH_URL` and does not open a browser

The agent must tell the user at every `WAITING_*` line.

`--otp` is a 6-digit authenticator code, not the npm token.
