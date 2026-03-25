#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$SCRIPT_DIR/ios"
BUILD_DIR="$IOS_DIR/build/TestFlight"
ARCHIVE_PATH="$BUILD_DIR/SlabHubCRM-unsigned.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
EXPORT_PLIST="$BUILD_DIR/ExportOptions.plist"
IPA_PATH="$EXPORT_DIR/SlabHubCRM.ipa"
BUILD_NUMBER_COUNTER_FILE="${BUILD_NUMBER_COUNTER_FILE:-$SCRIPT_DIR/.testflight_build_number}"

ASC_KEY_ID="${ASC_KEY_ID:-JUV388FGL8}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-ac6e6f3b-3b98-46e6-a50f-0a2306a636d6}"
ASC_KEY_PATH="${ASC_KEY_PATH:-/Users/nikita/Downloads/AuthKey_JUV388FGL8.p8}"
TEAM_ID="${TEAM_ID:-7ZA73WA82N}"
EXPO_PUBLIC_DOMAIN="${EXPO_PUBLIC_DOMAIN:-https://slabhub.gg/api/v1}"
export EXPO_PUBLIC_DOMAIN

LAST_BUILD_NUMBER=0
if [[ -f "$BUILD_NUMBER_COUNTER_FILE" ]]; then
  COUNTER_VALUE="$(tr -d '[:space:]' < "$BUILD_NUMBER_COUNTER_FILE")"
  if [[ "$COUNTER_VALUE" =~ ^[0-9]+$ ]]; then
    LAST_BUILD_NUMBER="$COUNTER_VALUE"
  else
    echo "Warning: invalid counter value in $BUILD_NUMBER_COUNTER_FILE, resetting." >&2
  fi
fi

GIT_COUNT=0
if git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_COUNT="$(git -C "$SCRIPT_DIR" rev-list --count HEAD)"
fi

if [[ -z "${BUILD_NUMBER:-}" ]]; then
  BASE_BUILD_NUMBER="$LAST_BUILD_NUMBER"
  if (( GIT_COUNT > BASE_BUILD_NUMBER )); then
    BASE_BUILD_NUMBER="$GIT_COUNT"
  fi
  BUILD_NUMBER="$((BASE_BUILD_NUMBER + 1))"
elif ! [[ "$BUILD_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "Error: BUILD_NUMBER must be numeric, got '$BUILD_NUMBER'" >&2
  exit 1
fi

if (( BUILD_NUMBER > LAST_BUILD_NUMBER )); then
  mkdir -p "$(dirname "$BUILD_NUMBER_COUNTER_FILE")"
  echo "$BUILD_NUMBER" > "$BUILD_NUMBER_COUNTER_FILE"
fi

echo "==> Syncing build number $BUILD_NUMBER to app.json..."
cd "$SCRIPT_DIR"
node -e "const fs=require('fs'); const a=JSON.parse(fs.readFileSync('app.json','utf8')); if(!a.expo.ios) a.expo.ios={}; a.expo.ios.buildNumber='$BUILD_NUMBER'; fs.writeFileSync('app.json',JSON.stringify(a,null,2));"

echo "==> Running Expo prebuild..."
npx expo prebuild --platform ios --no-install

if [[ ! -d "$IOS_DIR" ]]; then
  echo "Error: iOS directory not found: $IOS_DIR" >&2
  exit 1
fi

if [[ ! -f "$ASC_KEY_PATH" ]]; then
  echo "Error: ASC key file not found: $ASC_KEY_PATH" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"
cd "$IOS_DIR"

echo "Using EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"
echo "Using BUILD_NUMBER=$BUILD_NUMBER"
echo "Using BUILD_NUMBER_COUNTER_FILE=$BUILD_NUMBER_COUNTER_FILE"
echo "==> 1/4 Build unsigned archive"
xcodebuild \
  -workspace SlabHubCRM.xcworkspace \
  -scheme SlabHubCRM \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  INFOPLIST_KEY_CFBundleVersion="$BUILD_NUMBER" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  archive | tee "$BUILD_DIR/archive-unsigned.log"

echo "==> 2/4 Create ExportOptions.plist"
cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
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

echo "==> 3/4 Export signed IPA"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" | tee "$BUILD_DIR/export.log"

if [[ ! -f "$IPA_PATH" ]]; then
  echo "Error: IPA was not created: $IPA_PATH" >&2
  exit 1
fi

echo "==> 4/4 Upload IPA to TestFlight"
UPLOAD_OUTPUT="$(xcrun altool \
  --upload-app \
  -f "$IPA_PATH" \
  -t ios \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID" \
  --p8-file-path "$ASC_KEY_PATH" \
  --output-format json)"

echo "$UPLOAD_OUTPUT" | tee "$BUILD_DIR/upload.json"

if echo "$UPLOAD_OUTPUT" | grep -q '"product-errors"'; then
  echo "Upload failed. See $BUILD_DIR/upload.json for details." >&2
  exit 1
fi

DELIVERY_UUID="$(echo "$UPLOAD_OUTPUT" | sed -n 's/.*"delivery-uuid"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
if [[ -n "$DELIVERY_UUID" ]]; then
  echo
  echo "Upload succeeded. delivery-uuid: $DELIVERY_UUID"
  echo "Check status command:"
  echo "xcrun altool --build-status --delivery-id \"$DELIVERY_UUID\" --apiKey \"$ASC_KEY_ID\" --apiIssuer \"$ASC_ISSUER_ID\" --p8-file-path \"$ASC_KEY_PATH\" --output-format json"
else
  echo "Upload finished, but delivery-uuid was not parsed automatically." >&2
fi
