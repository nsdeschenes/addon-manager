#!/usr/bin/env bash
set -eu
# Invoked by Craft during "prepare". Craft sets CRAFT_OLD_VERSION and CRAFT_NEW_VERSION;
# for backward compatibility $1/$2 are also passed.
# Updates package.json version so it stays in sync with the release.
NEW_VERSION="${CRAFT_NEW_VERSION:-${2:?missing new version}}"

if command -v jq &>/dev/null; then
  jq --arg v "$NEW_VERSION" '.version = $v' package.json > package.json.tmp
  mv package.json.tmp package.json
else
  # Fallback when jq isn't available (e.g. local prepare)
  NEW_VERSION="$NEW_VERSION" node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    p.version = process.env.NEW_VERSION;
    fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  "
fi
