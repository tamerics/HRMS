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
    SharedPreferences.getInstance().then((prefs) {
      if (mounted) {
        setState(() {
          token = prefs.getString('auth_token');
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
        http.get(Uri.parse('$apiBaseUrl/mobile/bootstrap'), headers: headers),
        http.get(Uri.parse('$apiBaseUrl/attendance'), headers: headers),
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

