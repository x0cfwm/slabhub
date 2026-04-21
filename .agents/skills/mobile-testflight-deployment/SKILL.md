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

## Manual fallback (when the script fails)

If you need to re-run a single step (e.g. re-upload an existing IPA without re-archiving), the three underlying commands are below. All paths are relative to `apps/mobile/ios`.

First, export the env vars:
```bash
export ASC_KEY_ID="JUV388FGL8"
export ASC_ISSUER_ID="ac6e6f3b-3b98-46e6-a50f-0a2306a636d6"
export ASC_KEY_PATH="/Users/nikita/Downloads/AuthKey_JUV388FGL8.p8"
export TEAM_ID="7ZA73WA82N"
```

### 1) Build unsigned archive
```bash
mkdir -p build/TestFlight
xcodebuild \
  -workspace SlabHubCRM.xcworkspace \
  -scheme SlabHubCRM \
  -configuration Release \
  -archivePath build/TestFlight/SlabHubCRM-unsigned.xcarchive \
  -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  archive | tee build/TestFlight/archive-unsigned.log
```

### 2) Export signed IPA
```bash
cat > build/TestFlight/ExportOptions.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>7ZA73WA82N</string>
  <key>destination</key><string>export</string>
  <key>stripSwiftSymbols</key><true/>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
PLIST

xcodebuild \
  -exportArchive \
  -archivePath build/TestFlight/SlabHubCRM-unsigned.xcarchive \
  -exportPath build/TestFlight/export \
  -exportOptionsPlist build/TestFlight/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" | tee build/TestFlight/export.log
```

### 3) Upload IPA
```bash
xcrun altool \
  --upload-app \
  -f build/TestFlight/export/SlabHubCRM.ipa \
  -t ios \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID" \
  --p8-file-path "$ASC_KEY_PATH" \
  --output-format json
```

Note: if rebuilding manually, the archive step must include `CURRENT_PROJECT_VERSION=<n>` and `INFOPLIST_KEY_CFBundleVersion=<n>` overrides (higher than the previous TestFlight upload), and you must inject entitlements before export:

```bash
codesign --force --sign - \
  --entitlements SlabHubCRM/SlabHubCRM.entitlements \
  build/TestFlight/SlabHubCRM-unsigned.xcarchive/Products/Applications/SlabHubCRM.app
```
