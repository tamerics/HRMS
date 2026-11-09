import 'package:flutter_test/flutter_test.dart';

import 'package:withinearth_hr/main.dart';

void main() {
  testWidgets('Withinearth HR app renders', (tester) async {
    await tester.pumpWidget(const WithinearthHrApp());
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(WithinearthHrApp), findsOneWidget);
  });
}
