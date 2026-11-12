import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'leave_screen.dart';
import 'claims_screen.dart';
import 'payroll_screen.dart';
import 'profile_screen.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000/api',
);

ThemeData withinearthTheme() {
  const ink = Color(0xff163f4a);
  const accent = Color(0xffe86f51);
  const canvas = Color(0xfff7f9f7);
  final scheme = ColorScheme.fromSeed(
    seedColor: ink,
    brightness: Brightness.light,
  ).copyWith(
    primary: ink,
    secondary: accent,
    surface: Colors.white,
    surfaceContainerLow: const Color(0xffeef4f1),
  );
  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: canvas,
    useMaterial3: true,
    fontFamily: 'Inter',
    visualDensity: VisualDensity.standard,
    appBarTheme: const AppBarTheme(
      backgroundColor: canvas,
      foregroundColor: ink,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: ink),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(24))),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xffe8efeb),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        borderSide: BorderSide.none,
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      height: 76,
      elevation: 0,
      backgroundColor: Colors.white,
      indicatorColor: Color(0xffd5ebed),
      labelTextStyle: WidgetStatePropertyAll(TextStyle(fontWeight: FontWeight.w600)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        side: const BorderSide(color: Color(0xff8b999b)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
  );
}mport 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'leave_screen.dart';
import 'claims_screen.dart';
import 'payroll_screen.dart';
import 'profile_screen.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000/api',
);

ThemeData withinearthTheme() {
  const ink = Color(0xff123b45);
  const accent = Color(0xffdf5b3f);
  const canvas = Color(0xfff3f6f2);
  final scheme = ColorScheme.fromSeed(
    seedColor: ink,
    brightness: Brightness.light,
  ).copyWith(
    primary: ink,
    secondary: accent,
    surface: Colors.white,
  );
  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: canvas,
    useMaterial3: true,
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: canvas,
      foregroundColor: ink,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xffe7ece6),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
    ),
  );
}

void main() {
  runApp(const WithinearthHrApp());
}

class WithinearthHrApp extends StatelessWidget {
  const WithinearthHrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Withinearth HR',
      theme: withinearthTheme(),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? token;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().timeout(const Duration(seconds: 5)).then((prefs) {
      if (mounted) {
        setState(() {
          token = prefs.getString('auth_token');
          loading = false;
        });
      }
    }).catchError((_) {
      if (mounted) {
        setState(() {
          token = null;
          loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return token == null
        ? LoginScreen(onLogin: (value) => setState(() => token = value))
        : DashboardScreen(token: token!, onLogout: _logout);
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    if (mounted) setState(() => token = null);
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({required this.onLogin, super.key});

  final ValueChanged<String> onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool submitting = false;

  Future<void> _login() async {
    setState(() {
      submitting = true;
      error = null;
    });

    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email.text.trim(),
          'password': password.text,
        }),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 400) {
        throw Exception(data['error'] ?? 'Login failed');
      }
      final token = data['token'] as String;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', token);
      widget.onLogin(token);
    } catch (err) {
      setState(() => error = err.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.people_alt_outlined, size: 64),
                  const SizedBox(height: 16),
                  Text(
                    'Withinearth HR',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Sign in to your HR workspace',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 32),
                  TextField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: password,
                    obscureText: true,
                    onSubmitted: (_) => _login(),
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: submitting ? null : _login,
                    child: Text(submitting ? 'Signing in…' : 'Sign in'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({required this.token, required this.onLogout, super.key});

  final String token;
  final VoidCallback onLogout;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? employee;
  List<dynamic> attendance = [];
  List<dynamic> announcements = [];
  String? error;
  String? attendanceMessage;
  bool loading = true;
  bool attendanceSubmitting = false;
  int selectedDestination = 0;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      final headers = {'Authorization': 'Bearer ${widget.token}'};
      final results = await Future.wait([
        http
            .get(Uri.parse('$apiBaseUrl/mobile/bootstrap'), headers: headers)
            .timeout(const Duration(seconds: 20)),
        http
            .get(Uri.parse('$apiBaseUrl/attendance'), headers: headers)
            .timeout(const Duration(seconds: 20)),
      ]);
      if (results.any((response) => response.statusCode >= 400)) {
        throw Exception('Unable to load your HR workspace');
      }
      final bootstrap = jsonDecode(results[0].body) as Map<String, dynamic>;
      setState(() {
        employee = bootstrap['employee'] as Map<String, dynamic>?;
        attendance = jsonDecode(results[1].body) as List<dynamic>;
        announcements = (bootstrap['announcements'] as List<dynamic>?) ?? [];
        loading = false;
      });
    } catch (err) {
      setState(() {
        error = err.toString().replaceFirst('Exception: ', '');
        loading = false;
      });
    }
  }

  Future<void> _clock(String action) async {
    setState(() {
      attendanceSubmitting = true;
      attendanceMessage = null;
      error = null;
    });
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/attendance/clock-$action'),
        headers: {
          'Authorization': 'Bearer ${widget.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({}),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 400) {
        throw Exception(data['error'] ?? 'Attendance action failed');
      }
      setState(() => attendanceMessage = action == 'in' ? 'Clocked in successfully.' : 'Clocked out successfully.');
      await _loadDashboard();
    } catch (err) {
      setState(() => error = err.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => attendanceSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = employee?['name'] ?? 'Employee';
    final annualLeave = employee?['leaveBalance']?['annual'] ?? 0;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Withinearth HR'),
        actions: [
          IconButton(onPressed: _loadDashboard, tooltip: 'Refresh', icon: const Icon(Icons.refresh_rounded)),
          IconButton(onPressed: widget.onLogout, tooltip: 'Sign out', icon: const Icon(Icons.logout_rounded)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Text('Good afternoon,', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.blueGrey)),
            Text(name, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 18),
            Card(
              color: Theme.of(context).colorScheme.primary,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 25,
                      backgroundColor: Color(0xffd5ebed),
                      child: Icon(Icons.person_rounded, color: Color(0xff163f4a)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Your HR workspace', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text('Everything you need, in one place.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text('Quick actions', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _ActionTile(icon: Icons.event_available_rounded, label: 'Leave', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LeaveScreen(token: widget.token, apiBaseUrl: apiBaseUrl))))),
                const SizedBox(width: 10),
                Expanded(child: _ActionTile(icon: Icons.receipt_long_rounded, label: 'Claims', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClaimsScreen(token: widget.token, apiBaseUrl: apiBaseUrl))))),
                const SizedBox(width: 10),
                Expanded(child: _ActionTile(icon: Icons.payments_rounded, label: 'Payroll', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => PayrollScreen(token: widget.token, apiBaseUrl: apiBaseUrl))))),
              ],
            ),
            const SizedBox(height: 18),
            if (loading) const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator())),
            if (error != null) Card(child: Padding(padding: const EdgeInsets.all(16), child: Text(error!, style: TextStyle(color: Colors.red)))),
            if (!loading && error == null) ...[
              Row(
                children: [
                  Expanded(child: _MetricCard(icon: Icons.calendar_month_rounded, title: 'Leave balance', value: '$annualLeave days', detail: 'Annual available')),
                  const SizedBox(width: 12),
                  Expanded(child: _MetricCard(icon: Icons.access_time_filled_rounded, title: 'Attendance', value: 'Today', detail: attendanceMessage ?? 'Ready to clock in')),
                ],
              ),
              const SizedBox(height: 4),
              Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Today’s attendance', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text(attendanceMessage ?? 'Keep your attendance up to date.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey)),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: FilledButton.icon(onPressed: attendanceSubmitting ? null : () => _clock('in'), icon: const Icon(Icons.login_rounded), label: const Text('Clock in'))),
                          const SizedBox(width: 10),
                          Expanded(child: OutlinedButton.icon(onPressed: attendanceSubmitting ? null : () => _clock('out'), icon: const Icon(Icons.logout_rounded), label: const Text('Clock out'))),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text('Announcements', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              if (announcements.isEmpty) const Card(child: ListTile(leading: Icon(Icons.campaign_outlined), title: Text('No announcements yet'))),
              ...announcements.take(3).map((item) => Card(child: ListTile(leading: const Icon(Icons.campaign_outlined), title: Text(item['title']?.toString() ?? 'Announcement'), subtitle: Text(item['body']?.toString() ?? item['message']?.toString() ?? '')))),
            ],
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedDestination,
        onDestinationSelected: (index) {
          setState(() => selectedDestination = index);
          if (index == 0) return;
          final destination = switch (index) {
            1 => LeaveScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
            2 => ClaimsScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
            3 => PayrollScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
            _ => employee == null ? null : ProfileScreen(employee: employee!),
          };
          if (destination != null) Navigator.of(context).push(MaterialPageRoute(builder: (_) => destination));
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event_rounded), label: 'Leave'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long_rounded), label: 'Claims'),
          NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments_rounded), label: 'Payroll'),
          NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }
}rt 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'leave_screen.dart';
import 'claims_screen.dart';
import 'payroll_screen.dart';
import 'profile_screen.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000/api',
);

ThemeData withinearthTheme() {
  const ink = Color(0xff163f4a);
  const accent = Color(0xffe86f51);
  const canvas = Color(0xfff7f9f7);
  final scheme = ColorScheme.fromSeed(
    seedColor: ink,
    brightness: Brightness.light,
  ).copyWith(
    primary: ink,
    secondary: accent,
    surface: Colors.white,
    surfaceContainerLow: const Color(0xffeef4f1),
  );
  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: canvas,
    useMaterial3: true,
    fontFamily: 'Inter',
    visualDensity: VisualDensity.standard,
    appBarTheme: const AppBarTheme(
      backgroundColor: canvas,
      foregroundColor: ink,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: ink),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(24))),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xffe8efeb),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        borderSide: BorderSide.none,
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      height: 76,
      elevation: 0,
      backgroundColor: Colors.white,
      indicatorColor: Color(0xffd5ebed),
      labelTextStyle: WidgetStatePropertyAll(TextStyle(fontWeight: FontWeight.w600)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        side: const BorderSide(color: Color(0xff8b999b)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
  );
}mport 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'leave_screen.dart';
import 'claims_screen.dart';
import 'payroll_screen.dart';
import 'profile_screen.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000/api',
);

ThemeData withinearthTheme() {
  const ink = Color(0xff123b45);
  const accent = Color(0xffdf5b3f);
  const canvas = Color(0xfff3f6f2);
  final scheme = ColorScheme.fromSeed(
    seedColor: ink,
    brightness: Brightness.light,
  ).copyWith(
    primary: ink,
    secondary: accent,
    surface: Colors.white,
  );
  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: canvas,
    useMaterial3: true,
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: canvas,
      foregroundColor: ink,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xffe7ece6),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
    ),
  );
}

void main() {
  runApp(const WithinearthHrApp());
}

class WithinearthHrApp extends StatelessWidget {
  const WithinearthHrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Withinearth HR',
      theme: withinearthTheme(),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? token;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().timeout(const Duration(seconds: 5)).then((prefs) {
      if (mounted) {
        setState(() {
          token = prefs.getString('auth_token');
          loading = false;
        });
      }
    }).catchError((_) {
      if (mounted) {
        setState(() {
          token = null;
          loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return token == null
        ? LoginScreen(onLogin: (value) => setState(() => token = value))
        : DashboardScreen(token: token!, onLogout: _logout);
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    if (mounted) setState(() => token = null);
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({required this.onLogin, super.key});

  final ValueChanged<String> onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool submitting = false;

  Future<void> _login() async {
    setState(() {
      submitting = true;
      error = null;
    });

    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email.text.trim(),
          'password': password.text,
        }),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 400) {
        throw Exception(data['error'] ?? 'Login failed');
      }
      final token = data['token'] as String;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', token);
      widget.onLogin(token);
    } catch (err) {
      setState(() => error = err.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.people_alt_outlined, size: 64),
                  const SizedBox(height: 16),
                  Text(
                    'Withinearth HR',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Sign in to your HR workspace',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 32),
                  TextField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: password,
                    obscureText: true,
                    onSubmitted: (_) => _login(),
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: submitting ? null : _login,
                    child: Text(submitting ? 'Signing in…' : 'Sign in'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({required this.token, required this.onLogout, super.key});

  final String token;
  final VoidCallback onLogout;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? employee;
  List<dynamic> attendance = [];
  List<dynamic> announcements = [];
  String? error;
  String? attendanceMessage;
  bool loading = true;
  bool attendanceSubmitting = false;
  int selectedDestination = 0;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      final headers = {'Authorization': 'Bearer ${widget.token}'};
      final results = await Future.wait([
        http
            .get(Uri.parse('$apiBaseUrl/mobile/bootstrap'), headers: headers)
            .timeout(const Duration(seconds: 20)),
        http
            .get(Uri.parse('$apiBaseUrl/attendance'), headers: headers)
            .timeout(const Duration(seconds: 20)),
      ]);
      if (results.any((response) => response.statusCode >= 400)) {
        throw Exception('Unable to load your HR workspace');
      }
      final bootstrap = jsonDecode(results[0].body) as Map<String, dynamic>;
      setState(() {
        employee = bootstrap['employee'] as Map<String, dynamic>?;
        attendance = jsonDecode(results[1].body) as List<dynamic>;
        announcements = (bootstrap['announcements'] as List<dynamic>?) ?? [];
        loading = false;
      });
    } catch (err) {
      setState(() {
        error = err.toString().replaceFirst('Exception: ', '');
        loading = false;
      });
    }
  }

  Future<void> _clock(String action) async {
    setState(() {
      attendanceSubmitting = true;
      attendanceMessage = null;
      error = null;
    });
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/attendance/clock-$action'),
        headers: {
          'Authorization': 'Bearer ${widget.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({}),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 400) {
        throw Exception(data['error'] ?? 'Attendance action failed');
      }
      setState(() => attendanceMessage = action == 'in' ? 'Clocked in successfully.' : 'Clocked out successfully.');
      await _loadDashboard();
    } catch (err) {
      setState(() => error = err.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => attendanceSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = employee?['name'] ?? 'Employee';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Withinearth HR'),
        actions: [
          IconButton(onPressed: _loadDashboard, icon: const Icon(Icons.refresh)),
          IconButton(onPressed: widget.onLogout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Welcome, $name', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: employee == null ? null : () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => ProfileScreen(employee: employee!)),
              ),
              icon: const Icon(Icons.person_outline),
              label: const Text('My profile'),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => LeaveScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
                ),
              ),
              icon: const Icon(Icons.event_available),
              label: const Text('Manage leave'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ClaimsScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
                ),
              ),
              icon: const Icon(Icons.receipt_long),
              label: const Text('Manage claims'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => PayrollScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
                ),
              ),
              icon: const Icon(Icons.payments_outlined),
              label: const Text('View payroll'),
            ),
            const SizedBox(height: 20),
            if (loading) const Center(child: CircularProgressIndicator()),
            if (error != null) Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            if (!loading && error == null) ...[
              Card(
                child: ListTile(
                  leading: const Icon(Icons.calendar_today),
                  title: const Text('Leave balance'),
                  subtitle: Text('${employee?['leaveBalance']?['annual'] ?? 0} annual days available'),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Today’s attendance', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      if (attendanceMessage != null)
                        Text(attendanceMessage!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: attendanceSubmitting ? null : () => _clock('in'),
                              icon: const Icon(Icons.login),
                              label: const Text('Clock in'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: attendanceSubmitting ? null : () => _clock('out'),
                              icon: const Icon(Icons.logout),
                              label: const Text('Clock out'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const SizedBox(height: 20),
              Text('Announcements', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              if (announcements.isEmpty) const Text('No announcements available.'),
              ...announcements.take(5).map((item) => Card(
                child: ListTile(
                  leading: const Icon(Icons.campaign_outlined),
                  title: Text(item['title']?.toString() ?? 'Announcement'),
                  subtitle: Text(item['body']?.toString() ?? item['message']?.toString() ?? ''),
                ),
              )),
              const SizedBox(height: 20),
                            Text('Recent attendance', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              if (attendance.isEmpty) const Text('No attendance records found.'),
              ...attendance.take(10).map((record) => ListTile(
                leading: const Icon(Icons.access_time),
                title: Text(record['date']?.toString() ?? 'Unknown date'),
                subtitle: Text('Status: ${record['status'] ?? 'Unknown'}'),
                trailing: Text(record['clockIn'] == null ? '—' : 'Clocked in'),
              )),
            ],
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedDestination,
        onDestinationSelected: (index) {
          setState(() => selectedDestination = index);
          if (index == 0) return;
          final destination = switch (index) {
            1 => LeaveScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
            2 => ClaimsScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
            3 => PayrollScreen(token: widget.token, apiBaseUrl: apiBaseUrl),
            _ => employee == null
                ? null
                : ProfileScreen(employee: employee!),
          };
          if (destination != null) {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => destination),
            );
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_outlined),
            selectedIcon: Icon(Icons.event),
            label: 'Leave',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Claims',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: 'Payroll',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}


class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
        child: Column(children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary, size: 28),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ]),
      ),
    ),
  );
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.icon, required this.title, required this.value, required this.detail});
  final IconData icon;
  final String title;
  final String value;
  final String detail;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 12),
        Text(title, style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Colors.blueGrey)),
        const SizedBox(height: 4),
        Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
        Text(detail, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.blueGrey)),
      ]),
    ),
  );
}

