#!/bin/bash

set -eo pipefail

# Find script directory (no support for symlinks)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

: "${CI_TOOL:=github}"
: "${CI_PLUGIN:=$DIR/plugins/${CI_TOOL}.sh}"

if [[ $GITHUB_EVENT_NAME == "push" ]]; then
  LAST_SUCCESSFUL_SHA=$(${CI_PLUGIN} sha last)
  echo "Last successful commit: ${LAST_SUCCESSFUL_SHA}"
  echo

  # Ensure we have all changes from last successful build
  if [[ -f $(git rev-parse --git-dir)/shallow ]]; then
    if [[ ${LAST_SUCCESSFUL_SHA} == "null" ]]; then
      git fetch --unshallow
    else
      DEPTH=1
      until git show "${LAST_SUCCESSFUL_SHA}" > /dev/null 2>&1
      do
        DEPTH=$((DEPTH+5))
        echo "Last successful commit not fetched yet. Fetching depth $DEPTH."
        git fetch --depth=$DEPTH
      done

      ${CI_PLUGIN} set-env "LAST_SUCCESSFUL_SHA" "${LAST_SUCCESSFUL_SHA}"
    fi
  fi
fi
