# Withinearth HR mobile

Flutter client for Android and iOS.

## Run locally

From this directory:

```bash
flutter pub get
flutter create --platforms=android,ios .
flutter run --dart-define=API_BASE_URL=https://hrms-abgo.onrender.com/api
```

For an Android APK connected to the hosted API:

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://hrms-abgo.onrender.com/api
```

The APK is created at
`build/app/outputs/flutter-apk/app-release.apk`.

For iOS (on macOS with Xcode):

```bash
flutter build ios --release --dart-define=API_BASE_URL=https://hrms-abgo.onrender.com/api
```

The mobile client uses the existing HRMS authentication endpoint, stores the JWT locally, and provides dashboard navigation for home, leave, claims, payroll, and profile.
