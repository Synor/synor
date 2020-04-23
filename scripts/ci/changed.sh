#!/bin/bash

set -eo pipefail

# Find script directory (no support for symlinks)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

: "${CI_TOOL:=github}"
: "${CI_PLUGIN:=$DIR/plugins/${CI_TOOL}.sh}"

IFS=$'\n' read -r -d '' -a projects < <(yarn --silent lerna list --loglevel=error --since "${LAST_SUCCESSFUL_SHA}" && printf '\0')

CHANGED_PROJECT_COUNT=${#projects[@]}

if [ "${CHANGED_PROJECT_COUNT}" -gt 0 ]; then
  echo "Changed projects:"
  printf " - %s\n" "${projects[@]}"
  echo
else
  echo "No changed projects!"
  echo
fi

${CI_PLUGIN} set-env "CHANGED_PROJECT_COUNT" "${CHANGED_PROJECT_COUNT}"
