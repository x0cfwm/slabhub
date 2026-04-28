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
EXPO_PUBLIC_DOMAIN="${EXPO_PUBLIC_DOMAIN:-https://api.slabhub.gg/v1}"

if [[ -z "${FACEBOOK_APP_ID:-}" && -f "$SCRIPT_DIR/../../.env" ]]; then
  FACEBOOK_APP_ID="$(sed -n 's/^FACEBOOK_APP_ID=//p' "$SCRIPT_DIR/../../.env" | head -n1 | tr -d '"')"
fi

EXPO_PUBLIC_FACEBOOK_APP_ID="${EXPO_PUBLIC_FACEBOOK_APP_ID:-${FACEBOOK_APP_ID:-}}"
export EXPO_PUBLIC_DOMAIN
export EXPO_PUBLIC_FACEBOOK_APP_ID

# CocoaPods 1.16+ on Ruby 3.2 crashes with Encoding::CompatibilityError unless
# locale is explicitly UTF-8. Force it here so `expo prebuild`'s pod install works.
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

LAST_BUILD_NUMBER=0
if [[ -f "$BUILD_NUMBER_COUNTER_FILE" ]]; then
  COUNTER_VALUE="$(tr -d '[:space:]' < "$BUILD_NUMBER_COUNTER_FILE")"
  if [[ "$COUNTER_VALUE" =~ ^[0-9]+$ ]]; then
    LAST_BUILD_NUMBER="$COUNTER_VALUE"
  else
    echo "Warning: invalid counter value in $BUILD_NUMBER_COUNTER_FILE, resetting." >&2
  fi
fi


if [[ -z "${BUILD_NUMBER:-}" ]]; then
  BUILD_NUMBER="$((LAST_BUILD_NUMBER + 1))"
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

echo "==> Running Expo prebuild (including pod install)..."
npx expo prebuild --platform ios

if [[ ! -d "$IOS_DIR" ]]; then
  echo "Error: iOS directory not found: $IOS_DIR" >&2
  exit 1
fi

# expo prebuild sometimes skips `pod install` silently (e.g. if it thinks the
# project is already bootstrapped). If the workspace is missing, run it manually.
if [[ ! -d "$IOS_DIR/SlabHubCRM.xcworkspace" ]]; then
  echo "==> Workspace missing — running pod install manually..."
  ( cd "$IOS_DIR" && pod install )
fi

if [[ ! -d "$IOS_DIR/SlabHubCRM.xcworkspace" ]]; then
  echo "Error: SlabHubCRM.xcworkspace was not generated. Check pod install output above." >&2
  exit 1
fi

if [[ ! -f "$ASC_KEY_PATH" ]]; then
  echo "Error: ASC key file not found: $ASC_KEY_PATH" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"
cd "$IOS_DIR"

echo "Using EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"
echo "Using EXPO_PUBLIC_FACEBOOK_APP_ID=${EXPO_PUBLIC_FACEBOOK_APP_ID:-<unset>}"
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

echo "==> 1.5/4 Inject Entitlements into Unsigned Archive"
# Inject the entitlements manually so that xcodebuild exportArchive requests the correct App Store profile
if [[ -f "$IOS_DIR/SlabHubCRM/SlabHubCRM.entitlements" ]]; then
  codesign --force --sign - --entitlements "$IOS_DIR/SlabHubCRM/SlabHubCRM.entitlements" "$ARCHIVE_PATH/Products/Applications/SlabHubCRM.app"
  echo "Injected SlabHubCRM.entitlements into archive"
else
  echo "Warning: No entitlements file found at $IOS_DIR/SlabHubCRM/SlabHubCRM.entitlements"
fi

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
# --verbose streams per-asset progress to stderr so you see the upload live;
# JSON result still goes to stdout and gets captured for delivery-uuid parsing.
UPLOAD_OUTPUT="$(xcrun altool \
  --upload-app \
  -f "$IPA_PATH" \
  -t ios \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID" \
  --p8-file-path "$ASC_KEY_PATH" \
  --verbose \
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
