#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "TaskWish requires curl to download create-project." >&2
  exit 1
fi

system="$(uname -s)"
machine="$(uname -m)"

case "${system}" in
  Darwin) os="darwin" ;;
  Linux) os="linux" ;;
  MINGW*|MSYS*|CYGWIN*) os="windows" ;;
  *)
    echo "TaskWish does not have a create-project binary for ${system}." >&2
    exit 1
    ;;
esac

case "${machine}" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64) arch="x64" ;;
  *)
    echo "TaskWish does not have a create-project binary for ${machine}." >&2
    exit 1
    ;;
esac

platform="${os}-${arch}"
if [ "${os}" = "linux" ]; then
  libc="$(ldd --version 2>&1 || true)"
  if printf '%s' "${libc}" | grep -qi musl; then
    if [ "${arch}" = "arm64" ]; then
      echo "TaskWish does not yet have a create-project binary for Linux ARM64 with musl." >&2
      exit 1
    fi
    platform="${platform}-musl"
  fi
fi

suffix=""
if [ "${os}" = "windows" ]; then
  suffix=".exe"
fi

temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

executable="${temporary_directory}/create-taskwish-project${suffix}"
base_url="${TASKWISH_CLI_BASE_URL:-https://taskwish.ai/cli}"
url="${base_url%/}/create-taskwish-project-${platform}${suffix}"

echo "Downloading TaskWish create-project for ${platform}..."
curl -fL --retry 3 --output "${executable}" "${url}"
chmod +x "${executable}"

"${executable}" "$@"
