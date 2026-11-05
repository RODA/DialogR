#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GH_TOKEN:-}" ]; then
  echo "DIALOGFORGE_SIGNING_TOKEN is required to run the DialogForge signing broker." >&2
  exit 1
fi

broker=dusadrian/DialogForge
run_id=$(gh api --method POST "repos/$broker/actions/workflows/sign-windows-product.yml/dispatches" \
  --raw-field ref=main \
  --field return_run_details=true \
  --raw-field "inputs[product_repository]=$GITHUB_REPOSITORY" \
  --raw-field "inputs[product_ref]=$PRODUCT_REF" \
  --raw-field "inputs[release_tag]=$RELEASE_TAG" \
  --raw-field "inputs[release_repository]=$RELEASE_REPOSITORY" \
  --raw-field "inputs[overwrite_release_assets]=$OVERWRITE_RELEASE_ASSETS" \
  --jq '.workflow_run_id')

if [[ ! "$run_id" =~ ^[0-9]+$ ]]; then
  echo "GitHub did not return a signing run ID." >&2
  exit 1
fi

run_url="https://github.com/$broker/actions/runs/$run_id"
echo "Waiting for signed Windows publication: $run_url"
for ((attempt = 0; attempt < 120; attempt++)); do
  result=$(gh api "repos/$broker/actions/runs/$run_id" \
    --jq 'if .status == "completed" then .conclusion else "pending" end')
  case "$result" in
    success)
      echo "Windows release upload verified: $run_url"
      exit 0
      ;;
    pending)
      sleep 15
      ;;
    *)
      echo "Windows signing or publication ended with $result: $run_url" >&2
      exit 1
      ;;
  esac
done

echo "Timed out waiting for Windows signing and publication: $run_url" >&2
exit 1
