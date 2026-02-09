#!/usr/bin/env bash
set -euo pipefail

PROFILE="oblik-prod"

echo "Refreshing AWS SSO credentials for profile: $PROFILE"

# Run SSO login
aws sso login --profile "$PROFILE"

# Verify credentials
echo ""
echo "Verifying credentials..."
if aws sts get-caller-identity --profile "$PROFILE" > /dev/null 2>&1; then
  echo "AWS credentials refreshed successfully."
  echo "Profile: $PROFILE"
  echo "Session valid for 12 hours."
else
  echo "ERROR: Credential verification failed." >&2
  echo "Try running: aws configure sso --profile $PROFILE" >&2
  exit 1
fi
