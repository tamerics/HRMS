# Withinearth HR mobile

Flutter client for Android and iOS.

## Run locally

Install Flutter, then run:

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

Use the deployed API URL for a device or release build:

```bash
flutter build apk --dart-define=API_BASE_URL=https://api.withinearthhr.com/api
flutter build ios --dart-define=API_BASE_URL=https://api.withinearthhr.com/api
```

The mobile client uses the existing HRMS authentication endpoint and stores the JWT locally.
