#!/bin/bash

set -eo pipefail

# Find script directory (no support for symlinks)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

CODECOV="/tmp/codecov.sh"
codecov_yml=$(readlink -f "${DIR}/../../.codecov.yml")

if [ ! -f ${CODECOV} ]; then
  curl --silent --location "https://codecov.io/bash" --output "${CODECOV}"
  chmod u+x "${CODECOV}"
fi

codecov_flag=${LERNA_PACKAGE_NAME#*/}
codecov_flag=${codecov_flag/-/_}

${CODECOV} -y "${codecov_yml}" -F "${codecov_flag}" -s "${PWD}"
