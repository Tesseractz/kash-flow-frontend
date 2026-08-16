#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-${SCRIPT_DIR}/.env.deploy}"
DIST_DIR="${SCRIPT_DIR}/dist"
curl_config=""

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  [[ -z "$curl_config" ]] || rm -f -- "$curl_config"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

escape_curl_config() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  printf '%s' "$value"
}

# Percent-encode each path byte while preserving directory separators. Vite's
# public directory can contain filenames with spaces or other URL-unsafe bytes.
urlencode_path() {
  local LC_ALL=C
  local input="$1" output="" char encoded
  local i

  for ((i = 0; i < ${#input}; i++)); do
    char="${input:i:1}"
    case "$char" in
      [A-Za-z0-9._~/-]) output+="$char" ;;
      *)
        printf -v encoded '%%%02X' "'$char"
        output+="$encoded"
        ;;
    esac
  done

  printf '%s' "$output"
}

command -v npm >/dev/null 2>&1 || fail "npm is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v cmp >/dev/null 2>&1 || fail "cmp is required"
command -v find >/dev/null 2>&1 || fail "find is required"
command -v mktemp >/dev/null 2>&1 || fail "mktemp is required"
command -v sort >/dev/null 2>&1 || fail "sort is required"
[[ -f "$ENV_FILE" ]] || fail "deployment environment file not found: $ENV_FILE"

# This file is local and trusted. Quote values containing shell characters.
# Vite separately loads the same file because the build runs in deploy mode.
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${VITE_API_BASE_URL:?Set VITE_API_BASE_URL in $ENV_FILE}"
: "${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL in $ENV_FILE}"
: "${VITE_SUPABASE_ANON_KEY:?Set VITE_SUPABASE_ANON_KEY in $ENV_FILE}"
: "${CPANEL_FTP_HOST:?Set CPANEL_FTP_HOST in $ENV_FILE}"
: "${CPANEL_FTP_USER:?Set CPANEL_FTP_USER in $ENV_FILE}"
: "${CPANEL_FTP_PASSWORD:?Set CPANEL_FTP_PASSWORD in $ENV_FILE}"

CPANEL_FTP_PORT="${CPANEL_FTP_PORT:-21}"
CPANEL_ALLOW_PLAIN_FTP="${CPANEL_ALLOW_PLAIN_FTP:-false}"
CPANEL_DRY_RUN="${CPANEL_DRY_RUN:-true}"

[[ "$VITE_API_BASE_URL" =~ ^https://[^[:space:]]+$ ]] || fail "VITE_API_BASE_URL must be an HTTPS URL"
[[ "$VITE_SUPABASE_URL" =~ ^https://[^[:space:]]+$ ]] || fail "VITE_SUPABASE_URL must be an HTTPS URL"
[[ "$CPANEL_FTP_HOST" =~ ^[A-Za-z0-9.-]+$ ]] || fail "CPANEL_FTP_HOST contains unsupported characters"
[[ "$CPANEL_FTP_USER" =~ ^[A-Za-z0-9@._+-]+$ ]] || fail "CPANEL_FTP_USER contains unsupported characters"
[[ "$CPANEL_FTP_PORT" =~ ^[0-9]+$ ]] || fail "CPANEL_FTP_PORT must be numeric"
[[ "$CPANEL_ALLOW_PLAIN_FTP" == "true" || "$CPANEL_ALLOW_PLAIN_FTP" == "false" ]] || fail "CPANEL_ALLOW_PLAIN_FTP must be true or false"
[[ "$CPANEL_DRY_RUN" == "true" || "$CPANEL_DRY_RUN" == "false" ]] || fail "CPANEL_DRY_RUN must be true or false"
[[ "$VITE_SUPABASE_ANON_KEY" != "replace_with_your_supabase_anon_key" ]] || fail "replace the Supabase anon-key placeholder in $ENV_FILE"
[[ "$CPANEL_FTP_PASSWORD" != "replace_with_your_ftp_password" ]] || fail "replace the FTP password placeholder in $ENV_FILE"

# Export only the public build variables. FTP credentials stay in this shell
# and are never inherited by npm or Vite.
export VITE_API_BASE_URL VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY

printf 'Building the production SPA with Vite deploy mode...\n'
(
  cd "$SCRIPT_DIR"
  npm run build -- --mode deploy
)

[[ -f "$DIST_DIR/index.html" ]] || fail "build did not produce dist/index.html"
[[ -f "$DIST_DIR/.htaccess" ]] || fail "build did not include dist/.htaccess for SPA routing"

mapfile -d '' upload_files < <(
  find "$DIST_DIR" -type f ! -path "$DIST_DIR/index.html" -print0 | sort -z
)
upload_files+=("$DIST_DIR/index.html")

printf 'Deployment order (%d files; index.html last):\n' "${#upload_files[@]}"
for local_file in "${upload_files[@]}"; do
  printf '  %s\n' "${local_file#"$DIST_DIR"/}"
done

if [[ "$CPANEL_DRY_RUN" == "true" ]]; then
  printf 'Dry run complete. No files were uploaded.\n'
  printf 'Set CPANEL_DRY_RUN=false in %s to deploy.\n' "$ENV_FILE"
  exit 0
fi

curl_config="$(mktemp "${TMPDIR:-/tmp}/kashpoint-frontend-curl.XXXXXX")"
chmod 600 "$curl_config"
credentials="$(escape_curl_config "${CPANEL_FTP_USER}:${CPANEL_FTP_PASSWORD}")"
printf 'user = "%s"\n' "$credentials" > "$curl_config"

remote_url="ftp://${CPANEL_FTP_HOST}:${CPANEL_FTP_PORT}/"
curl_args=(
  --config "$curl_config"
  --ftp-pasv
  --connect-timeout 30
  --retry 2
  --fail
  --silent
  --show-error
)

if [[ "$CPANEL_ALLOW_PLAIN_FTP" == "false" ]]; then
  curl_args+=(--ssl-reqd)
  connection_label="password-based FTPS"
else
  connection_label="unencrypted FTP"
  printf 'Warning: CPANEL_ALLOW_PLAIN_FTP=true; the FTP password and files are not encrypted in transit.\n' >&2
fi

if command -v getent >/dev/null 2>&1 && ! getent ahosts "$CPANEL_FTP_HOST" >/dev/null 2>&1; then
  fail "FTP host '$CPANEL_FTP_HOST' does not resolve"
fi

printf 'Checking %s connection to %s:%s/ (FTP account root)...\n' \
  "$connection_label" "$CPANEL_FTP_HOST" "$CPANEL_FTP_PORT"
curl "${curl_args[@]}" --list-only "$remote_url" >/dev/null \
  || fail "could not connect to the FTP account root"

for local_file in "${upload_files[@]}"; do
  relative_path="${local_file#"$DIST_DIR"/}"
  encoded_path="$(urlencode_path "$relative_path")"
  printf 'Uploading %s...\n' "$relative_path"
  curl "${curl_args[@]}" \
    --ftp-create-dirs \
    --upload-file "$local_file" \
    "${remote_url}${encoded_path}"
done

for local_file in "${upload_files[@]}"; do
  relative_path="${local_file#"$DIST_DIR"/}"
  encoded_path="$(urlencode_path "$relative_path")"
  printf 'Verifying %s...\n' "$relative_path"
  curl "${curl_args[@]}" "${remote_url}${encoded_path}" \
    | cmp --silent "$local_file" - \
    || fail "remote verification failed for $relative_path"
done

printf 'Deployment complete and verified: %s\n' "$remote_url"
