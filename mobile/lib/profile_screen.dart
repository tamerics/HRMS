import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({required this.employee, super.key});

  final Map<String, dynamic> employee;

  @override
  Widget build(BuildContext context) {
    final fields = {
      'Name': employee['name'],
      'Email': employee['email'],
      'Department': employee['department'],
      'Role': employee['role'],
      'Employee number': employee['employeeNo'],
      'Mobile': employee['mobile'],
      'Employment status': employee['employmentStatus'],
    };
    return Scaffold(
      appBar: AppBar(title: const Text('My profile')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const CircleAvatar(radius: 36, child: Icon(Icons.person, size: 38)),
          const SizedBox(height: 20),
          ...fields.entries.where((entry) => entry.value != null && entry.value.toString().isNotEmpty).map(
            (entry) => Card(
              child: ListTile(title: Text(entry.key), subtitle: Text(entry.value.toString())),
            ),
          ),
        ],
      ),
    );
  }
}
