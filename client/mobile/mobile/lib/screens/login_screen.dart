import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart';
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
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFF0F172A), // Slate 900
                  const Color(0xFF1E293B), // Slate 800
                ],
              ),
            ),
          ),
          // Subtle Grid or Glow (Optional - kept simple for now)
          
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Logo / Title
                    Icon(Icons.inventory_2_outlined, size: 64, color: primary)
                        .animate().fadeIn(duration: 600.ms).scale(),
                    const SizedBox(height: 16),
                    Text(
                      'NEXUS',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: 4,
                        color: Colors.white,
                      ),
                    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.3, end: 0),
                    Text(
                      'INVENTORY SYSTEM',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: Colors.grey,
                        letterSpacing: 2,
                      ),
                    ).animate().fadeIn(delay: 400.ms),
                    const SizedBox(height: 48),

                    // Login Form Card
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: theme.cardColor.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            _isRegister ? 'Create Account' : 'Welcome Back',
                            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          
                          TextField(
                            controller: _email, 
                            decoration: const InputDecoration(
                              labelText: 'Email',
                              prefixIcon: Icon(Icons.email_outlined),
                            ),
                          ).animate().fadeIn(delay: 600.ms).slideX(),
                          
                          const SizedBox(height: 16),
                          
                          if (_isRegister) 
                            TextField(
                              controller: _name, 
                              decoration: const InputDecoration(
                                labelText: 'Full Name',
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                            ).animate().fadeIn().slideX(),

                          if (_isRegister) const SizedBox(height: 16),

                          TextField(
                            controller: _password, 
                            decoration: const InputDecoration(
                              labelText: 'Password',
                              prefixIcon: Icon(Icons.lock_outline),
                            ), 
                            obscureText: true
                          ).animate().fadeIn(delay: 800.ms).slideX(),
                          
                          const SizedBox(height: 24),
                          
                          ElevatedButton(
                            onPressed: _loading ? null : _onSubmit,
                            child: _loading 
                              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                              : Text(_isRegister ? 'REGISTER' : 'LOGIN'),
                          ).animate().fadeIn(delay: 1000.ms).shimmer(delay: 2000.ms, duration: 1500.ms),
                          
                          const SizedBox(height: 16),
                          
                          TextButton(
                            onPressed: _loading ? null : () => setState(() { _isRegister = !_isRegister; _status = null; }),
                            child: Text(
                              _isRegister ? 'Already have an account? Login' : 'Don\'t have an account? Register',
                              style: TextStyle(color: Colors.white70),
                            ),
                          ).animate().fadeIn(delay: 1200.ms),
                        ],
                      ),
                    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2, end: 0),

                    if (_status != null) Padding(
                      padding: const EdgeInsets.only(top: 24),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          _status!, 
                          style: const TextStyle(color: Colors.redAccent),
                          textAlign: TextAlign.center,
                        ),
                      ).animate().fadeIn().shake(),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
