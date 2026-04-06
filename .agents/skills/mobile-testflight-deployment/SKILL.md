---
name: Mobile TestFlight Deployment
description: Guidelines for building and pushing the SlabHub CRM mobile app to TestFlight
---

# Mobile TestFlight Deployment

This skill provides instructions for the iOS build and upload process using the custom automation script.

## Core Script
- **Path**: `apps/mobile/scripts/testflight_build_upload.sh`
- **Purpose**: Automates versioning, prebuild, archiving, signing, and uploading to App Store Connect.

## Build Number Management
- **Location**: `apps/mobile/.testflight_build_number`
- **Logic**: The script uses a strictly sequential build number. It increments the value in the counter file by 1 for each build.
- **Manual Override**: You can force a specific build number by setting the `BUILD_NUMBER` environment variable:
  ```bash
  BUILD_NUMBER=15 bash scripts/testflight_build_upload.sh
  ```

## Prerequisites
- **App Store Connect API Key**: Located at `/Users/nikita/Downloads/AuthKey_JUV388FGL8.p8`
- **Environment Variables**: The script defines defaults for `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `TEAM_ID`.

## Deployment Workflow
1. Ensure `git status` is clean or changes are intended for the build.
2. Navigate to `apps/mobile`.
3. Run the deployment script:
   ```bash
   bash scripts/testflight_build_upload.sh
   ```
4. Monitor the output for `UPLOAD SUCCEEDED`.
5. Capture the `delivery-uuid` to check processing status.

## Status Checks
To check if Apple has finished processing the build, use:
```bash
xcrun altool --build-status --delivery-id "<delivery-uuid>" --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" --p8-file-path "$ASC_KEY_PATH" --output-format json
```
