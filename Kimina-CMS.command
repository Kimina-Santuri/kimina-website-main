#!/bin/zsh

set -e

SCRIPT_DIRECTORY="${0:A:h}"
cd "$SCRIPT_DIRECTORY"

if [[ ! -d node_modules ]]; then
  echo "Installing Kimina CMS dependencies…"
  npm install
fi

(
  for attempt in {1..30}; do
    if curl --silent --fail http://127.0.0.1:3000/api/state >/dev/null; then
      open http://127.0.0.1:3000
      exit 0
    fi
    sleep 1
  done
) &

echo "Starting Kimina CMS…"
echo "Press Control-C to stop it."
exec npm run cms
