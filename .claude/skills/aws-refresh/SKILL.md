---
name: aws-refresh
description: Refreshes AWS SSO credentials for the oblik-prod profile. Use when AWS commands fail with expired token, credential, or authentication errors, or when you need to verify AWS access before running AWS operations. Use proactively at the start of sessions involving AWS resources.
---

# AWS Credential Refresh

Refreshes AWS SSO credentials for the `oblik-prod` profile used by this project.

## When to use this skill

Use this skill when:

- AWS commands fail with "Token has expired and refresh failed"
- AWS commands fail with credential or authentication errors
- You need to verify AWS access before running AWS operations
- At the start of a session when working with AWS resources

## Instructions

When this skill is invoked:

1. **Explain** to the user that AWS credentials need to be refreshed.

2. **Run the login script**:
   ```bash
   ./aws-login.sh
   ```

3. **Verify credentials** after the script completes:
   ```bash
   export AWS_PROFILE=oblik-prod
   aws sts get-caller-identity --profile oblik-prod
   ```

4. **On success**, inform the user:
   - `AWS_PROFILE` is set to `oblik-prod`
   - Credentials are valid for 12 hours
   - They can now continue with AWS operations

5. **On failure**, inform the user and suggest:
   - Check their AWS SSO configuration
   - Run `aws configure sso --profile oblik-prod` if needed
   - Ensure they have proper access to the Oblik AWS account

## Important notes

- Always use `AWS_PROFILE=oblik-prod` or `--profile oblik-prod` with AWS CLI commands
- The profile name is `oblik-prod` (not just "oblik")
- SSO sessions are valid for 12 hours after login
- The script handles AWS SSO login automatically
- **Act proactively** — when you detect expired AWS credentials, invoke this skill immediately without asking the user first
