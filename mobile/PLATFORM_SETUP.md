# Android and iOS release setup

The Dart client is ready. Generate native platform folders from the mobile directory with Flutter installed:

    flutter create --platforms=android,ios .
    flutter pub get
    flutter analyze
    flutter test

Application identifiers:
- Android: com.withinearth.hr
- iOS bundle identifier: com.withinearth.hr

Build examples:

    flutter build apk --release --dart-define=API_BASE_URL=https://api.withinearthhr.com/api
    flutter build appbundle --release --dart-define=API_BASE_URL=https://api.withinearthhr.com/api
    flutter build ipa --release --dart-define=API_BASE_URL=https://api.withinearthhr.com/api

Android release signing requires a private upload keystore. iOS release builds require an Apple Developer account, signing certificate, provisioning profile, and App Store Connect configuration. Do not commit signing keys or certificates.