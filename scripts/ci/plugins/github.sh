#!/bin/bash

# Documentation
read -r -d '' USAGE_TEXT << EOM
Usage: github.sh command [<param>...]
Run given command in github.

Requires github environment variables (additional may be required for specific commands):
  GITHUB_REPOSITORY
  GITHUB_TOKEN

Available commands:
  sha <position>            get revision hash on given positions
                            available positions:
                                last        hash of last succesfull build commit
                                            only commits of 'build' job are considered
                                            accepts: GITHUB_REF, if ommited no branch filtering
                                current     hash of current commit
                                            requires: GITHUB_SHA
  set-env <name> <value>    set environment variable
  help                      display this usage text
EOM

set -e

GITHUB_URL="https://api.github.com/repos/${GITHUB_REPOSITORY}"

# Functions

##
# Print message on stderr to do not affect stdout which can be used as input to another commands.
#
# Input:
#    MESSAGE - message to print
#
function log {
  MESSAGE=$1
  >&2 echo "$MESSAGE"
}

##
# Print error message and exit program with status code 1
#
# Input:
#   MESSAGE - error message to show
##
function fail {
  MESSAGE=$1
  log "ERROR: $MESSAGE"
  log "$USAGE_TEXT"
  exit 1
}

##
# Fast fail when given environment variable is not set.
#
# Input:
#   ENV_VAR - name of environment variable to check
##
function require_env_var {
  local ENV_VAR=$1
  if [[ -z "${!ENV_VAR}" ]]; then
    fail "$ENV_VAR is not set"
  fi
}

##
# Fast fail when given parameter is empty
#
# Input:
#   MESSAGE - message to show when requirement is not met
#   PARAM - parameter which should be not null
##
function require_not_null {
  local MESSAGE=$1
  if [[ -z "$2" ]]; then
    fail "$MESSAGE"
  fi
}

##
# Make HTTP POST call to github
#
# Input:
#   URL - part of URL after github repo base url
#   DATA - form data to post (optional)
##
function post {
  local URL=$1
  local DATA=$2
  if [[ -n $DATA ]]; then
    DATA="-H 'Content-Type: application/json' -d '$DATA'"
  fi
  eval "curl -XPOST -s -g -H 'Accept: application/vnd.github.v3+json' -H 'Authorization: token ${GITHUB_TOKEN}' ${DATA} ${GITHUB_URL}/${URL}"
}

##
# Make HTTP GET call to github
#
# Input:
#   URL - part of URL after github base url
##
function get {
  local URL=$1
  curl -s -g -H "Accept: application/vnd.github.v3+json" -H "Authorization: token ${GITHUB_TOKEN}" "${GITHUB_URL}/${URL}"
}

##
# Get current branch name
##
function get_branch {
  echo "${GITHUB_REF##*/}"
}

##
# Get revision hash of last commit which invoked successful test workflow
#
# Output:
#   revision hash or null when there were no commits yet
##
function get_last_successful_commit {
  BRANCH=$(get_branch)
  if [[ -n "$BRANCH" ]]; then
    BRANCH_FILTER='and .head_branch == "'${BRANCH}'"'
  fi
  SELECTOR='.conclusion == "success" '${BRANCH_FILTER}''
  get 'actions/workflows/ci.yml/runs' | jq -r "[ .workflow_runs[] | select($SELECTOR) ] | max_by(.run_number | tonumber).head_sha"
}

##
# Get revision hash of current commit
#
# Output:
#   revision hash or null when there were no commits yet
##
function get_current_commit {
  require_env_var GITHUB_SHA
  echo "$GITHUB_SHA"
}

##
# Set environment variable
#
# Input:
#   name  - name of the variable
#   value - value for the variable
##
function set_env {
  local -r name="${1}"
  local -r value="${2}"
  require_not_null "name is missing" "${name}"
  require_not_null "value is missing" "${value}"
  export "${name}"="${value}"
  echo "${name}=${value}" >> "${GITHUB_ENV}"
}
##
# Main
##

# Validatate common requirements
require_env_var GITHUB_REPOSITORY
require_env_var GITHUB_TOKEN

# Parse command
case $1 in
  sha)
    case $2 in
      last)
        get_last_successful_commit
        ;;
      current)
        get_current_commit
        ;;
      *)
        fail "Unknown hash position $2"
        ;;
    esac
    ;;
  set-env)
    set_env "$2" "$3"
    ;;
  *)
    fail "Unknown command $1"
    ;;
esac
