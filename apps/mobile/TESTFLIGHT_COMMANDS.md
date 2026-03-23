# TestFlight build/upload commands

## One-command run

```bash
bash /Users/nikita/Work/slabhub/apps/mobile/scripts/testflight_build_upload.sh
```

Optional (set custom build number manually):

```bash
BUILD_NUMBER=2 bash /Users/nikita/Work/slabhub/apps/mobile/scripts/testflight_build_upload.sh
```

Note: `BUILD_NUMBER` must always be higher than the previous TestFlight upload for the same app version.
If `BUILD_NUMBER` is not set, the script auto-increments local counter file:
`/Users/nikita/Work/slabhub/apps/mobile/.testflight_build_number`
(with `git rev-list --count HEAD` as minimum baseline).

## 0) Prerequisites (one-time)

```bash
cd /Users/nikita/Work/slabhub/apps/mobile/ios

export ASC_KEY_ID="JUV388FGL8"
export ASC_ISSUER_ID="ac6e6f3b-3b98-46e6-a50f-0a2306a636d6"
export ASC_KEY_PATH="/Users/nikita/Downloads/AuthKey_JUV388FGL8.p8"
export TEAM_ID="7ZA73WA82N"
export EXPO_PUBLIC_DOMAIN="https://slabhub.gg/api/v1"
# optional: defaults to git rev-list --count HEAD
export BUILD_NUMBER="202603210040"
# optional: custom counter file path
export BUILD_NUMBER_COUNTER_FILE="/Users/nikita/Work/slabhub/apps/mobile/.testflight_build_number"
```

## 1) Build unsigned archive

```bash
cd /Users/nikita/Work/slabhub/apps/mobile/ios
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

## 2) Export signed IPA for TestFlight

```bash
cd /Users/nikita/Work/slabhub/apps/mobile/ios

cat > build/TestFlight/ExportOptions.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>7ZA73WA82N</string>
  <key>destination</key>
  <string>export</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
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

IPA output:

```bash
ls -lah build/TestFlight/export/SlabHubCRM.ipa
```

## 3) Upload IPA to TestFlight

```bash
cd /Users/nikita/Work/slabhub/apps/mobile/ios

xcrun altool \
  --upload-app \
  -f build/TestFlight/export/SlabHubCRM.ipa \
  -t ios \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID" \
  --p8-file-path "$ASC_KEY_PATH" \
  --verbose \
  --output-format json
```

Expected success line:

```text
UPLOAD SUCCEEDED with no errors
```

The command returns `delivery-uuid`. Save it to check processing status.

## 4) Check processing status in App Store Connect

```bash
cd /Users/nikita/Work/slabhub/apps/mobile/ios

# replace with value from upload output
export DELIVERY_UUID="<delivery-uuid>"

xcrun altool \
  --build-status \
  --delivery-id "$DELIVERY_UUID" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID" \
  --p8-file-path "$ASC_KEY_PATH" \
  --output-format json
```

When status becomes ready in App Store Connect, assign build in TestFlight groups.
