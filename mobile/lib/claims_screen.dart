import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ClaimsScreen extends StatefulWidget {
  const ClaimsScreen({required this.token, required this.apiBaseUrl, super.key});

  final String token;
  final String apiBaseUrl;

  @override
  State<ClaimsScreen> createState() => _ClaimsScreenState();
}

class _ClaimsScreenState extends State<ClaimsScreen> {
  final amount = TextEditingController();
  final description = TextEditingController();
  String category = 'Travel';
  DateTime? expenseDate;
  String? attachmentName;
  String? message;
  List<dynamic> claims = [];
  bool loading = true;
  bool submitting = false;

  @override
  void initState() {
    super.initState();
    _loadClaims();
  }

  Future<void> _loadClaims() async {
    final response = await http.get(
      Uri.parse('${widget.apiBaseUrl}/mobile/claims'),
      headers: {'Authorization': 'Bearer ${widget.token}'},
    );
    if (response.statusCode < 400) {
      setState(() {
        claims = jsonDecode(response.body) as List<dynamic>;
        loading = false;
      });
    } else {
      setState(() => loading = false);
    }
  }

  Future<void> _pickDate() async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDate: DateTime.now(),
    );
    if (value != null) setState(() => expenseDate = value);
  }

  Future<void> _submit() async {
    if (expenseDate == null || amount.text.trim().isEmpty) {
      setState(() => message = 'Enter an amount and choose the expense date.');
      return;
    }
    setState(() {
      submitting = true;
      message = null;
    });
    final response = await http.post(
      Uri.parse('${widget.apiBaseUrl}/mobile/claims'),
      headers: {
        'Authorization': 'Bearer ${widget.token}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'category': category,
        'expenseDate': expenseDate!.toIso8601String().substring(0, 10),
        'amount': double.tryParse(amount.text.trim()),
        'description': description.text.trim(),
        'attachmentName': attachmentName,
      }),
    );
    if (!mounted) return;
    setState(() {
      submitting = false;
      message = response.statusCode < 400 ? 'Claim submitted.' : 'Unable to submit claim.';
    });
    if (response.statusCode < 400) {
      amount.clear();
      description.clear();
      await _loadClaims();
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel = expenseDate == null ? 'Select expense date' : expenseDate!.toIso8601String().substring(0, 10);
    return Scaffold(
      appBar: AppBar(title: const Text('Claims')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          DropdownButtonFormField<String>(
            value: category,
            decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
            items: ['Travel', 'Medical', 'Meals', 'Equipment', 'Other']
                .map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
            onChanged: (value) => setState(() => category = value!),
          ),
          const SizedBox(height: 12),
          TextField(controller: amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _pickDate, child: Text(dateLabel)),
          TextField(controller: description, maxLines: 3, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => setState(() => attachmentName = 'receipt-selected'),
            icon: const Icon(Icons.attach_file),
            label: Text(attachmentName == null ? 'Attach receipt' : 'Receipt attached'),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: submitting ? null : _submit, child: Text(submitting ? 'Submitting…' : 'Submit claim')),
          if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!)),
          const SizedBox(height: 24),
          Text('My claims', style: Theme.of(context).textTheme.titleLarge),
          if (loading) const CircularProgressIndicator(),
          ...claims.map((claim) => ListTile(
            title: Text('${claim['category'] ?? 'Claim'} • ${claim['amount'] ?? ''}'),
            subtitle: Text(claim['expenseDate']?.toString() ?? ''),
            trailing: Text(claim['status']?.toString() ?? 'Pending'),
          )),
        ],
      ),
    );
  }
}
