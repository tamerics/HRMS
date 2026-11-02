import 'package:flutter_test/flutter_test.dart';

import 'package:withinearth_hr/main.dart';

void main() {
  testWidgets('Withinearth HR app shows sign in screen', (tester) async {
    await tester.pumpWidget(const WithinearthHrApp());
    expect(find.text('Withinearth HR'), findsOneWidget);
    expect(find.text('Sign in to your HR workspace'), findsOneWidget);
  });
}
