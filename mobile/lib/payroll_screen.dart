import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({required this.token, required this.apiBaseUrl, super.key});

  final String token;
  final String apiBaseUrl;

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  List<dynamic> payslips = [];
  bool loading = true;
  String? message;

  @override
  void initState() {
    super.initState();
    _loadPayslips();
  }

  Future<void> _loadPayslips() async {
    final response = await http.get(
      Uri.parse('${widget.apiBaseUrl}/payslips'),
      headers: {'Authorization': 'Bearer ${widget.token}'},
    );
    if (!mounted) return;
    if (response.statusCode < 400) {
      setState(() {
        payslips = jsonDecode(response.body) as List<dynamic>;
        loading = false;
      });
    } else {
      setState(() {
        message = 'Unable to load payslips.';
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payroll')),
      body: RefreshIndicator(
        onRefresh: _loadPayslips,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Payslips', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            if (loading) const Center(child: CircularProgressIndicator()),
            if (message != null) Text(message!),
            if (!loading && payslips.isEmpty) const Text('No payslips have been published yet.'),
            ...payslips.map((payslip) => Card(
              child: ListTile(
                leading: const Icon(Icons.receipt_long),
                title: Text(payslip['period']?.toString() ?? payslip['month']?.toString() ?? 'Payslip'),
                subtitle: Text('Net pay: ${payslip['netPay'] ?? payslip['netSalary'] ?? 'Not specified'}'),
                trailing: const Icon(Icons.chevron_right),
              ),
            )),
          ],
        ),
      ),
    );
  }
}
