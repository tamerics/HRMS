import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({required this.token, required this.apiBaseUrl, super.key});

  final String token;
  final String apiBaseUrl;

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  final reason = TextEditingController();
  String type = 'Vacation';
  DateTime? startDate;
  DateTime? endDate;
  List<dynamic> requests = [];
  String? message;
  bool loading = true;
  bool submitting = false;

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    final response = await http.get(
      Uri.parse('${widget.apiBaseUrl}/leave'),
      headers: {'Authorization': 'Bearer ${widget.token}'},
    );
    if (response.statusCode < 400) {
      setState(() {
        requests = jsonDecode(response.body) as List<dynamic>;
        loading = false;
      });
    } else {
      setState(() => loading = false);
    }
  }

  Future<void> _pickDate(bool start) async {
    final value = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: DateTime.now(),
    );
    if (value != null) setState(() => start ? startDate = value : endDate = value);
  }

  Future<void> _submit() async {
    if (startDate == null || endDate == null) {
      setState(() => message = 'Choose both start and end dates.');
      return;
    }
    setState(() {
      submitting = true;
      message = null;
    });
    final response = await http.post(
      Uri.parse('${widget.apiBaseUrl}/leave'),
      headers: {
        'Authorization': 'Bearer ${widget.token}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'type': type,
        'startDate': startDate!.toIso8601String().substring(0, 10),
        'endDate': endDate!.toIso8601String().substring(0, 10),
        'reason': reason.text.trim(),
      }),
    );
    if (!mounted) return;
    setState(() {
      submitting = false;
      message = response.statusCode < 400 ? 'Leave request submitted.' : 'Unable to submit leave request.';
    });
    if (response.statusCode < 400) {
      reason.clear();
      await _loadRequests();
    }
  }

  @override
  Widget build(BuildContext context) {
    String dateLabel(DateTime? value) => value == null ? 'Select date' : value.toIso8601String().substring(0, 10);
    return Scaffold(
      appBar: AppBar(title: const Text('Leave')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          DropdownButtonFormField<String>(
            initialValue: type,
            decoration: const InputDecoration(labelText: 'Leave type', border: OutlineInputBorder()),
            items: ['Vacation', 'Sick', 'Personal', 'Emergency', 'Funeral']
                .map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
            onChanged: (value) => setState(() => type = value!),
          ),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: () => _pickDate(true), child: Text('Start: ${dateLabel(startDate)}')),
          OutlinedButton(onPressed: () => _pickDate(false), child: Text('End: ${dateLabel(endDate)}')),
          TextField(controller: reason, maxLines: 3, decoration: const InputDecoration(labelText: 'Reason', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          FilledButton(onPressed: submitting ? null : _submit, child: Text(submitting ? 'Submitting…' : 'Submit request')),
          if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!)),
          const SizedBox(height: 24),
          Text('My requests', style: Theme.of(context).textTheme.titleLarge),
          if (loading) const CircularProgressIndicator(),
          ...requests.map((request) => ListTile(
            title: Text(request['type']?.toString() ?? 'Leave'),
            subtitle: Text('${request['startDate'] ?? ''} to ${request['endDate'] ?? ''}'),
            trailing: Text(request['status']?.toString() ?? 'Pending'),
          )),
        ],
      ),
    );
  }
}
