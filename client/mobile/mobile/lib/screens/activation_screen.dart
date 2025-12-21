import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:async';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image/image.dart' as img;

class ActivationScreen extends StatefulWidget {
  const ActivationScreen({super.key});
  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> with WidgetsBindingObserver {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    returnImage: false,
  );
  bool _handled = false;
  String? _status;
  String? _userId;
  bool _analyzingImage = false;
  bool _ready = false;
  bool _assigning = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadToken();
    _controller.start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _handled = false;
      _controller.start();
    } else if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _controller.stop();
    }
  }

  Future<void> _restartScanner() async {
    _handled = false;
    await _controller.start();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _userId = prefs.getString('token');
      _ready = _userId != null && _userId!.isNotEmpty;
    });
  }

  Future<void> _assignWarehouse(String wid) async {
    if (_assigning) return;
    if (_userId == null || _userId!.isEmpty) {
      setState(() { _status = 'Sesi login tidak tersedia. Silakan login ulang.'; });
      await _restartScanner();
      return;
    }
    _assigning = true;
    setState(() { _status = 'Menghubungkan ke server...'; });
    final client = GraphQLProvider.of(context).value;
    final m = gql(r'''mutation($userId:ID!,$warehouseId:ID!){ assignStaffToWarehouse(userId:$userId,warehouseId:$warehouseId) }''');
    QueryResult r;
    try {
      r = await client
          .mutate(MutationOptions(document: m, variables: { 'userId': _userId, 'warehouseId': wid }))
          .timeout(const Duration(seconds: 12));
    } on TimeoutException {
      setState(() { _status = 'Koneksi timeout. Periksa internet/Ngrok.'; });
      await _restartScanner();
      _assigning = false;
      return;
    }
    if (r.hasException) {
      final msg = r.exception?.graphqlErrors.isNotEmpty == true
          ? r.exception!.graphqlErrors.first.message
          : (r.exception?.toString() ?? 'Gagal aktivasi');
      setState(() { _status = msg; });
      await _restartScanner();
      _assigning = false;
      return;
    }
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Aktivasi Berhasil'),
        content: const Text('Anda telah diaktifkan pada gudang.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
        ],
      ),
    );
    if (!mounted) return;
    Navigator.of(context).pop();
    _assigning = false;
  }

  Future<String?> _findWarehouseIdFromCode(String code) async {
    final client = GraphQLProvider.of(context).value;
    final q = gql(r'''query { warehouses { id code } }''');
    final r = await client.query(QueryOptions(document: q, fetchPolicy: FetchPolicy.networkOnly));
    if (r.hasException) {
      setState(() { _status = r.exception.toString(); });
      return null;
    }
    final list = (r.data?['warehouses'] as List?) ?? [];
    for (final w in list) {
      final m = w as Map<String, dynamic>;
      if ((m['code']?.toString() ?? '').trim() == code.trim()) {
        return m['id']?.toString();
      }
    }
    return null;
  }

  Future<void> _processCode(String v) async {
    if (v.startsWith('ASSIGN_WAREHOUSE::')) {
      final wid = v.split('ASSIGN_WAREHOUSE::').last;
      await _assignWarehouse(wid);
    } else {
      final wid = await _findWarehouseIdFromCode(v);
      if (wid != null && wid.isNotEmpty) {
        await _assignWarehouse(wid);
      } else {
        setState(() { _status = 'QR tidak valid'; });
        await _restartScanner();
      }
    }
  }

  Future<void> _handleValue(String v) async {
    if (_handled) return;
    _handled = true;
    await _processCode(v);
  }

  Future<void> _pickImageAndAnalyze() async {
    if (_analyzingImage) return;
    _analyzingImage = true;
    try {
      await _controller.stop();
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1600, maxHeight: 1600, imageQuality: 85);
      if (picked == null) {
        await _controller.start();
        return;
      }
      String usePath = picked.path;
      final lower = usePath.toLowerCase();
      if (!(lower.endsWith('.jpg') || lower.endsWith('.jpeg'))) {
        final bytes = await picked.readAsBytes();
        final decoded = img.decodeImage(bytes);
        if (decoded != null) {
          final jpgBytes = img.encodeJpg(decoded, quality: 85);
          final tmp = File('${Directory.systemTemp.path}/qr_activation_${DateTime.now().millisecondsSinceEpoch}.jpg');
          await tmp.writeAsBytes(jpgBytes, flush: true);
          usePath = tmp.path;
        }
      } else {
        final f = File(usePath);
        if (await f.length() > 8 * 1024 * 1024) {
          final bytes = await f.readAsBytes();
          final decoded = img.decodeImage(bytes);
          if (decoded != null) {
            final resized = img.copyResize(decoded, width: decoded.width > 1600 ? 1600 : decoded.width, height: decoded.height > 1600 ? 1600 : decoded.height);
            final jpgBytes = img.encodeJpg(resized, quality: 80);
            final tmp = File('${Directory.systemTemp.path}/qr_activation_${DateTime.now().millisecondsSinceEpoch}.jpg');
            await tmp.writeAsBytes(jpgBytes, flush: true);
            usePath = tmp.path;
          }
        }
      }
      String? decodedText;
      {
        final capture = await _controller.analyzeImage(usePath);
        final codes = capture?.barcodes ?? <Barcode>[];
        if (codes.isNotEmpty) {
          final v = codes.first.rawValue ?? '';
          if (v.isNotEmpty) decodedText = v;
        }
      }
      if (decodedText == null) {
        final f = File(usePath);
        final bytes = await f.readAsBytes();
        final base = img.decodeImage(bytes);
        if (base != null) {
          final gray = img.grayscale(base);
          final sized = img.copyResize(gray, width: gray.width > 1600 ? 1600 : gray.width, height: gray.height > 1600 ? 1600 : gray.height);
          final jpgBytes = img.encodeJpg(sized, quality: 85);
          final tmp = File('${Directory.systemTemp.path}/qr_activation_pre_${DateTime.now().millisecondsSinceEpoch}.jpg');
          await tmp.writeAsBytes(jpgBytes, flush: true);
          final capture2 = await _controller.analyzeImage(tmp.path);
          final codes2 = capture2?.barcodes ?? <Barcode>[];
          if (codes2.isNotEmpty) {
            final v2 = codes2.first.rawValue ?? '';
            if (v2.isNotEmpty) decodedText = v2;
          }
        }
      }
      if (decodedText == null || decodedText.isEmpty) {
        setState(() { _status = 'QR tidak terdeteksi dari gambar'; });
        await _controller.start();
        return;
      }
      await _handleValue(decodedText);
    } catch (e) {
      setState(() { _status = e.toString(); });
      await _controller.start();
    } finally {
      _analyzingImage = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Aktivasi Gudang'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                MobileScanner(
                  controller: _controller,
                  onDetect: (capture) async {
                    if (!_ready) return;
                    if (_handled) return;
                    if (_assigning) return;
                    final codes = capture.barcodes;
                    if (codes.isEmpty) return;
                    final v = codes.first.rawValue ?? '';
                    if (v.isEmpty) return;
                    _handled = true;
                    await _controller.stop();
                    if (!mounted) return;
                    await _processCode(v);
                  },
                  errorBuilder: (context, error) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error, color: Colors.red, size: 40),
                            const SizedBox(height: 10),
                            Text(
                              'Error Kamera: ${error.errorCode}\n${error.errorDetails?.message ?? ""}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.red),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  placeholderBuilder: (context) {
                    return const Center(child: CircularProgressIndicator());
                  },
                ),
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.red, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Text(
                        'Scan QR Gudang',
                        style: TextStyle(color: Colors.red, backgroundColor: Colors.white54),
                      ),
                    ),
                  ),
                ),
                if (!_ready)
                  const Center(child: Text('Memuat sesi pengguna...', style: TextStyle(color: Colors.black))),
                if (_assigning)
                  const Center(child: CircularProgressIndicator()),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton(
                  onPressed: _pickImageAndAnalyze,
                  child: const Text('Upload Gambar QR untuk Aktivasi'),
                ),
                if (_status != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_status!, style: const TextStyle(color: Colors.red)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
