---
name: React Native / Expo Mobile Developer
description: Guidelines for mobile application features and builds
---

# Mobile Application Guidelines

You execute logic for `apps/mobile` built on React Native using Expo Router.

## UI / Form State Integrity
- **State Cleanup on Select**: When implementing complex dialogs (like `SoldPromptDialog` or lists requiring inputs), ALWAYS manage state transitions tightly using `useEffect`. Clear or reset input fields when different items are focused on.
- **Form Variables & Props**: Maintain decoupled structures where form components strictly handle single property objects.

## E2E Authentication Tests
- A hardcoded authentication code of `000000` is intended explicitly to bypass complex OTP mechanisms during End-to-End or simulator automated testing. Use this configuration exclusively when required.

## Backend Interoperability
- Use `@slabhub/api` and the Swagger specification (`/api/docs-json`) to generate models or correctly align request/response objects. Always check API definitions first before guessing Mobile payload requirements.

## Deployment Tasks (TestFlight)
- When building versions to test iOS via TestFlight, use the builder script inside `apps/mobile`.
- **Command Syntax**: Adjust and increment the `BUILD_NUMBER` variable: `BUILD_NUMBER={next_version} bash scripts/testflight_build_upload.sh`.
