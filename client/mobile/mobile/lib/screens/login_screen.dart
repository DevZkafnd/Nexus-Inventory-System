import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _name = TextEditingController();
  final _password = TextEditingController();
  bool _isRegister = false;
  bool _loading = false;
  String? _status;

  Future<void> _onSubmit() async {
    setState(() { _loading = true; _status = null; });
    try {
      final email = _email.text.trim();
      final pass = _password.text;
      if (email.isEmpty || pass.isEmpty) {
        setState(() { _status = 'Email dan password wajib diisi'; });
        return;
      }
      final emailOk = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
      if (!emailOk) {
        setState(() { _status = 'Format email tidak valid'; });
        return;
      }
      final client = GraphQLProvider.of(context).value;
      if (_isRegister) {
        final m = gql(r'''
          mutation($email:String!,$name:String,$password:String!){
            createUser(email:$email,name:$name,role:STAFF,password:$password){ id }
          }
        ''');
        final r = await client.mutate(MutationOptions(document: m, variables: {
          'email': email,
          'name': _name.text.trim().isEmpty ? null : _name.text.trim(),
          'password': pass,
        }));
        if (r.hasException) {
          final msg = r.exception.toString();
          if (msg.contains('Email sudah terdaftar') || msg.contains('Unique')) {
            setState(() { _status = 'User sudah ada, silakan gunakan email lain'; });
          } else {
            setState(() { _status = msg; });
          }
        } else {
          setState(() { _isRegister = false; _status = 'Registrasi berhasil, silakan login'; });
        }
      } else {
        final m = gql(r'''
          mutation($email:String!,$password:String!){
            login(email:$email,password:$password)
          }
        ''');
        final r = await client.mutate(MutationOptions(document: m, variables: {
          'email': email,
          'password': pass,
        }));
        if (r.hasException) { throw r.exception!; }
        final token = r.data?['login']?.toString() ?? '';
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const DashboardScreen()));
      }
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('Email atau password salah')) {
        setState(() { _status = 'Email atau password salah'; });
      } else {
        setState(() { _status = msg; });
      }
    } finally {
      setState(() { _loading = false; });
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login Staff')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
              if (_isRegister) TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nama')),
              TextField(controller: _password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _loading ? null : _onSubmit,
                child: Text(_isRegister ? 'Register' : 'Login'),
              ),
              TextButton(
                onPressed: _loading ? null : () => setState(() { _isRegister = !_isRegister; _status = null; }),
                child: Text(_isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Register'),
              ),
              if (_status != null) Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_status!, style: const TextStyle(color: Colors.red)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
