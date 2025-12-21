import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'scanner_screen.dart';
import 'activation_screen.dart';
import '../services/products_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? _status;
  bool _isShowingActivation = false;
  final Set<String> _warnedLowStockSkus = {}; // Untuk tracking peringatan stok
  Future<void> Function()? _refetchMe;
  Future<Map<String, dynamic>?> _getSelectedWarehouse(GraphQLClient client, String selectedId) async {
    final q = gql(r'''query { warehouses { id name stocks { quantity product { id name sku } } } }''');
    final r = await client.query(QueryOptions(document: q, fetchPolicy: FetchPolicy.networkOnly));
    if (r.hasException) { return null; }
    final arr = (r.data?['warehouses'] as List?) ?? [];
    for (final w in arr) {
      final m = w as Map<String, dynamic>;
      if (m['id']?.toString() == selectedId) return m;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/');
  }

  void _openActivationPage() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ActivationScreen())).then((_) async {
      if (_refetchMe != null) {
        await _refetchMe!();
      }
    });
  }

  void _ensureActivationPopup(Future<void> Function()? refetch) {
    if (_isShowingActivation) return;
    _isShowingActivation = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final nav = Navigator.of(context);
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Aktivasi Wajib'),
          content: const Text('Anda belum terdaftar di gudang mana pun. Lakukan aktivasi dengan scan QR admin atau unggah gambar QR.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                nav.push(MaterialPageRoute(builder: (_) => const ActivationScreen())).then((_) async {
                  _isShowingActivation = false;
                  if (refetch != null) {
                    await refetch();
                  }
                });
              },
              child: const Text('Aktivasi'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _isShowingActivation = false;
                _logout();
              },
              child: const Text('Logout'),
            ),
          ],
        ),
      );
    });
  }

  Future<void> _openInboundForm(String? warehouseId) async {
    if (warehouseId == null) {
      _openActivationPage();
      setState(() { _status = 'Silakan aktivasi gudang terlebih dahulu'; });
      return;
    }

    final client = GraphQLProvider.of(context).value;
    
    // Logic: Inbound Staff = Transfer dari Gudang Utama ke Gudang Staff
    
    // 1. Cari Gudang Utama (WH-GUDANG-UTAMA atau WH-MAIN atau "Gudang Utama")
    final q = gql(r'''query { warehouses { id name code stocks { quantity product { id name sku } } } }''');
    final r = await client.query(QueryOptions(document: q, fetchPolicy: FetchPolicy.networkOnly));
    
    if (r.hasException) {
       setState(() { _status = 'Gagal memuat data gudang'; });
       return;
    }
    
    final allWarehouses = (r.data?['warehouses'] as List?) ?? [];
    Map<String, dynamic>? mainWarehouse;
    
    try {
      mainWarehouse = allWarehouses.firstWhere(
        (w) => w['code'] == 'WH-GUDANG-UTAMA',
        orElse: () => allWarehouses.firstWhere(
           (w) => w['code'] == 'WH-MAIN',
           orElse: () => allWarehouses.firstWhere(
              (w) => w['name'] == 'Gudang Utama',
           ),
        ),
      );
    } catch (e) {
      mainWarehouse = null;
    }

    if (mainWarehouse == null) {
        if (!mounted) return;
        await showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
                title: const Text('Gudang Utama Tidak Ditemukan'),
                content: const Text('Sistem tidak dapat menemukan "Gudang Utama" (WH-GUDANG-UTAMA) sebagai sumber stok.'),
                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Tutup'))],
            )
        );
        return;
    }

    // 2. Ambil stok tersedia di Gudang Utama
    final mainStocks = (mainWarehouse['stocks'] as List?) ?? [];
    final availableProducts = mainStocks.where((s) => ((s['quantity'] as int?) ?? 0) > 0).toList();

    if (availableProducts.isEmpty) {
        if (!mounted) return;
        await showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
                title: const Text('Stok Utama Kosong'),
                content: const Text('Tidak ada stok tersedia di Gudang Utama untuk diambil.'),
                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Tutup'))],
            )
        );
        return;
    }

    if (!mounted) return;

    await showDialog(
      context: context,
      builder: (ctx) {
        String? selectedProductId;
        int maxQty = 0;
        final qtyCtrl = TextEditingController();

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Inbound (Ambil dari Utama)'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Sumber: ${mainWarehouse?['name']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'Pilih Produk (di Utama)'),
                      isExpanded: true,
                      value: selectedProductId,
                      items: availableProducts.map((s) {
                        final p = s['product'] as Map<String, dynamic>;
                        final pid = p['id'].toString();
                        final name = p['name'];
                        final sku = p['sku'];
                        final q = s['quantity'];
                        return DropdownMenuItem(
                          value: pid,
                          child: Text('$name ($sku) - Sisa: $q', overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                         setState(() {
                             selectedProductId = val;
                             final s = availableProducts.firstWhere(
                               (element) => element['product']['id'].toString() == val,
                               orElse: () => {},
                             );
                             if (s.isNotEmpty) {
                               maxQty = (s['quantity'] as int?) ?? 0;
                             }
                         });
                      },
                    ),
                    TextField(
                      controller: qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
                TextButton(
                  onPressed: () async {
                    if (selectedProductId == null) return;
                    final qty = int.tryParse(qtyCtrl.text.trim()) ?? 0;
                    if (qty <= 0) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quantity harus > 0')));
                        return;
                    }
                    if (qty > maxQty) {
                         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Stok Utama tidak cukup (Max: $maxQty)')));
                         return;
                    }

                    Navigator.pop(context); // Close dialog

                    try {
                         // Execute Mutation: transferStock (Main -> Staff Warehouse)
                         final m = gql(r'''mutation($fromWarehouseId:ID!,$toWarehouseId:ID!,$productId:ID!,$quantity:Int!,$note:String){ transferStock(fromWarehouseId:$fromWarehouseId,toWarehouseId:$toWarehouseId,productId:$productId,quantity:$quantity,note:$note){ id } }''');
                        final r = await client.mutate(MutationOptions(document: m, variables: {
                          'fromWarehouseId': mainWarehouse!['id'].toString(),
                          'toWarehouseId': warehouseId.toString(),
                          'productId': selectedProductId.toString(),
                          'quantity': qty,
                          'note': 'Staff Inbound (Restock)',
                        }));

                        if (r.hasException) {
                           throw r.exception!;
                        }

                        if (mounted) {
                            ScaffoldMessenger.of(this.context).showSnackBar(const SnackBar(content: Text('Berhasil Inbound (Stok Masuk)')));
                            this.setState(() { _status = 'Berhasil Inbound (Stok Masuk)'; });
                        }
                    } catch (e) {
                        if (mounted) {
                             ScaffoldMessenger.of(this.context).showSnackBar(SnackBar(content: Text('Error: $e')));
                        }
                    }
                  },
                  child: const Text('Terima'),
                ),
              ],
            );
          }
        );
      }
    );
  }

  Future<void> _openOutboundForm(String? warehouseId) async {
    if (warehouseId == null) {
      _openActivationPage();
      setState(() { _status = 'Silakan aktivasi gudang terlebih dahulu'; });
      return;
    }

    final client = GraphQLProvider.of(context).value;
    
    // Logic: Outbound = Barang Keluar (System Outbound)
    
    final wh = await _getSelectedWarehouse(client, warehouseId);
    if (wh == null) {
       setState(() { _status = 'Gagal memuat data gudang'; });
       return;
    }
    final stocks = (wh['stocks'] as List?) ?? [];
    final validStocks = stocks.where((s) => ((s['quantity'] as int?) ?? 0) > 0).toList();

    if (validStocks.isEmpty) {
        if (!mounted) return;
        await showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
                title: const Text('Stok Kosong'),
                content: const Text('Tidak ada produk tersedia untuk Outbound (Keluar).'),
                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Tutup'))],
            )
        );
        return;
    }

    if (!mounted) return;

    await showDialog(
      context: context,
      builder: (ctx) {
        String? selectedProductId;
        int maxQty = 0;
        final qtyCtrl = TextEditingController();

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Outbound (Barang Keluar)'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Gudang: ${wh['name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'Pilih Produk'),
                      isExpanded: true,
                      value: selectedProductId,
                      items: validStocks.map((s) {
                        final p = s['product'] as Map<String, dynamic>;
                        final pid = p['id'].toString();
                        final name = p['name'];
                        final sku = p['sku'];
                        final q = s['quantity'];
                        return DropdownMenuItem(
                          value: pid,
                          child: Text('$name ($sku) - Tersedia: $q', overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                               setState(() {
                                   selectedProductId = val;
                                   final s = validStocks.firstWhere(
                                     (element) => element['product']['id'].toString() == val,
                                     orElse: () => {},
                                   );
                                   if (s.isNotEmpty) {
                                     maxQty = (s['quantity'] as int?) ?? 0;
                                   }
                               });
                            },
                          ),
                          TextField(
                            controller: qtyCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Quantity'),
                          ),
                        ],
                      ),
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
                      TextButton(
                        onPressed: () async {
                          if (selectedProductId == null) return;
                          final qty = int.tryParse(qtyCtrl.text.trim()) ?? 0;
                          if (qty <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quantity harus > 0')));
                              return;
                          }
                          if (qty > maxQty) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Stok tidak cukup (Max: $maxQty)')));
                              return;
                          }

                          Navigator.pop(context);

                          try {
                              // Execute Mutation: outboundStock
                              final m = gql(r'''mutation($warehouseId:ID!,$productId:ID!,$quantity:Int!,$note:String){ outboundStock(warehouseId:$warehouseId,productId:$productId,quantity:$quantity,note:$note){ id } }''');
                              final r = await client.mutate(MutationOptions(document: m, variables: {
                                'warehouseId': warehouseId.toString(),
                                'productId': selectedProductId.toString(),
                                'quantity': qty,
                                'note': 'Staff Outbound',
                              }));

                              if (r.hasException) {
                                 final msg = r.exception!.graphqlErrors.isNotEmpty 
                                    ? r.exception!.graphqlErrors.first.message 
                                    : r.exception.toString();
                                 throw Exception(msg);
                              }

                              if (mounted) {
                                  ScaffoldMessenger.of(this.context).showSnackBar(const SnackBar(content: Text('Berhasil Outbound (Keluar)')));
                                  this.setState(() { _status = 'Berhasil Outbound (Keluar)'; });
                              }
                          } catch (e) {
                              if (mounted) {
                                   final msg = e.toString().replaceAll('Exception:', '').trim();
                                   ScaffoldMessenger.of(this.context).showSnackBar(SnackBar(
                                     content: Text('Gagal: $msg'),
                                     duration: const Duration(seconds: 4),
                                     backgroundColor: Colors.red,
                                   ));
                              }
                          }
                        },
                        child: const Text('Kirim'),
                      ),
              ],
            );
          }
        );
      }
    );
  }

  void _openTransferScanner(String? warehouseId) {
    if (warehouseId == null) {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ActivationScreen())).then((_) async {
        if (_refetchMe != null) {
          await _refetchMe!();
        }
      });
      setState(() { _status = 'Silakan aktivasi gudang terlebih dahulu'; });
      return;
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => ScannerScreen(onScan: (sku) async {
      try {
        final client = GraphQLProvider.of(context).value;
        final service = ProductsService(client);
        final qr = await client.query(service.productBySkuOptions(sku));
        if (qr.hasException) { throw qr.exception!; }
        final p = qr.data?['productBySku'];
        if (p == null) { throw Exception('Produk tidak ditemukan'); }
        final productId = p['id'].toString();
        final qw = gql(r'''query { warehouses { id name } }''');
        final wr = await client.query(QueryOptions(document: qw, fetchPolicy: FetchPolicy.networkOnly));
        if (wr.hasException) { throw wr.exception!; }
        final arr = (wr.data?['warehouses'] as List?) ?? [];
        final options = arr.map((e) => (e as Map<String, dynamic>)).where((m) => m['id']?.toString() != warehouseId).toList();
        if (!mounted) return;
        final result = await showDialog<Map<String, dynamic>>(
          context: context,
          builder: (ctx) {
            String? toId = options.isNotEmpty ? options.first['id']?.toString() : null;
            final qtyCtrl = TextEditingController();
            return StatefulBuilder(
              builder: (ctx2, setState2) {
                return AlertDialog(
                  title: const Text('Mutasi Stok'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: toId,
                          items: options.map((m) {
                            return DropdownMenuItem(
                              value: m['id']?.toString(),
                              child: Text(m['name']?.toString() ?? m['id']?.toString() ?? ''),
                            );
                          }).toList(),
                          onChanged: (v) => setState2(() { toId = v; }),
                        ),
                      ),
                      TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity')),
                    ],
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx2), child: const Text('Batal')),
                    TextButton(onPressed: () {
                      final v = int.tryParse(qtyCtrl.text.trim());
                      if (toId == null || toId!.isEmpty || v == null || v <= 0) {
                        return;
                      }
                      Navigator.pop(ctx2, { 'toId': toId, 'qty': v });
                    }, child: const Text('Kirim')),
                  ],
                );
              },
            );
          },
        );
        if (result == null) return;
        final toId = result['toId']?.toString() ?? '';
        final qty = result['qty'] as int;
        if (toId.isEmpty || qty <= 0) return;
        final wh = await _getSelectedWarehouse(client, warehouseId);
        int available = 0;
        if (wh != null) {
          final stocks = (wh['stocks'] as List?) ?? [];
          for (final s in stocks) {
            final m = s as Map<String, dynamic>;
            final pid = m['product']?['id']?.toString() ?? '';
            if (pid == productId) {
              available = (m['quantity'] as int?) ?? 0;
              break;
            }
          }
        }
        if (qty > available) {
          if (!mounted) return;
          await showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Validasi Stok'),
              content: Text('Quantity melebihi stok tersedia ($available).'),
              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Tutup'))],
            ),
          );
          return;
        }
        final m = gql(r'''mutation($fromWarehouseId:ID!,$toWarehouseId:ID!,$productId:ID!,$quantity:Int!){ transferStock(fromWarehouseId:$fromWarehouseId,toWarehouseId:$toWarehouseId,productId:$productId,quantity:$quantity){ id } }''');
        final r = await client.mutate(MutationOptions(document: m, variables: {
          'fromWarehouseId': warehouseId,
          'toWarehouseId': toId,
          'productId': productId,
          'quantity': qty,
        }));
        if (r.hasException) {
          final msg = r.exception?.graphqlErrors.isNotEmpty == true
              ? (r.exception!.graphqlErrors.first.message)
              : (r.exception?.toString() ?? 'Terjadi kesalahan');
          if (!mounted) return;
          await showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Transaksi Gagal'),
              content: Text(msg),
              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Tutup'))],
            ),
          );
          return;
        }
        if (!mounted) return;
        setState(() { _status = 'Transfer berhasil'; });
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transfer berhasil')));
      } catch (e) {
        if (!mounted) return;
        setState(() { _status = e.toString(); });
      }
    })));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Gudang'),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: Query(
        options: QueryOptions(
          document: gql(r'''query{ me { id name email role warehouses { id name } } }'''),
          fetchPolicy: FetchPolicy.networkOnly,
          pollInterval: const Duration(seconds: 1),
        ),
        builder: (result, {fetchMore, refetch}) {
          _refetchMe = refetch;
          if (result.isLoading) return const Center(child: CircularProgressIndicator());
          if (result.hasException) return Center(child: Text(result.exception.toString()));
          final me = result.data?['me'];
          if (me == null) return const Center(child: Text('Tidak ada data pengguna'));
          final w = (me['warehouses'] as List?) ?? [];
          final items = <Map<String, dynamic>>[];
          final seen = <String>{};
          for (final e in w) {
            final m = e as Map<String, dynamic>;
            final id = m['id']?.toString() ?? '';
            if (id.isEmpty) continue;
            if (seen.add(id)) items.add(m);
          }
          final ids = items.map((m) => m['id'].toString()).toList();
          final selected = ids.isNotEmpty ? ids.first : null;
          final selectedWarehouseName = (() {
            final found = items.firstWhere(
              (m) => m['id']?.toString() == selected,
              orElse: () => <String, dynamic>{},
            );
            return found.isNotEmpty ? (found['name']?.toString() ?? selected ?? '') : (selected ?? '');
          })();

          // Data User untuk ditampilkan
          final userName = me['name']?.toString() ?? 'User';
          final userRole = me['role']?.toString() ?? 'Staff';
          
          if (w.isEmpty) {
            _ensureActivationPopup(refetch);
            return Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Tampilkan info user meskipun belum punya gudang
                  Card(
                    color: Colors.orange.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        children: [
                          Text('Halo, $userName', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          Text('Role: $userRole', style: const TextStyle(color: Colors.grey)),
                          const SizedBox(height: 10),
                          const Text('Status: Belum ada gudang assigned'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(onPressed: _openActivationPage, child: const Text('Pergi ke Halaman Aktivasi')),
                  if (_status != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_status!, style: const TextStyle(color: Colors.red))),
                ],
              ),
            );
          }
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Info User & Gudang
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const CircleAvatar(child: Icon(Icons.person)),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(userName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                Text(userRole, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                              ],
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        const Text('Lokasi Gudang:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.warehouse, size: 20, color: Colors.blue),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                selectedWarehouseName,
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text('Menu Operasional', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _openInboundForm(selected),
                  icon: const Icon(Icons.download),
                  label: const Text('Inbound (Barang Masuk)'),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _openOutboundForm(selected),
                  icon: const Icon(Icons.upload),
                  label: const Text('Outbound (Barang Keluar)'),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _openTransferScanner(selected),
                  icon: const Icon(Icons.compare_arrows),
                  label: const Text('Mutasi (Transfer)'),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                ),
                if (_status != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_status!, style: const TextStyle(color: Colors.green))),
                const SizedBox(height: 24),
                Text('Stok Gudang: $selectedWarehouseName', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Query(
                  options: QueryOptions(
                    document: gql(r'''query { warehouses { id name stocks { quantity product { id name sku } } } }'''),
                    fetchPolicy: FetchPolicy.networkOnly,
                    pollInterval: const Duration(seconds: 1),
                  ),
                  builder: (stocksResult, {fetchMore, refetch}) {
                    if (stocksResult.isLoading) return const Center(child: CircularProgressIndicator());
                    if (stocksResult.hasException) return Text('Gagal memuat stok: ${stocksResult.exception}');
                    final arr = (stocksResult.data?['warehouses'] as List?) ?? [];
                    final selectedWarehouse = arr.cast<Map<String, dynamic>>().firstWhere(
                      (w) => w['id']?.toString() == selected,
                      orElse: () => <String, dynamic>{},
                    );
                    final itemsStocks = (selectedWarehouse['stocks'] as List?) ?? [];
                    if (selected == null) {
                      return const Text('Pilih gudang terlebih dahulu');
                    }
                    if (itemsStocks.isEmpty) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Text('Produk atau barang tidak ada atau kosong', style: TextStyle(fontSize: 16, color: Colors.grey)),
                        ),
                      );
                    }

                    // --- LOGIKA PERINGATAN STOK KURANG DARI 10 ---
                    final lowStockItems = <String>[];
                    final currentLowStockSkus = <String>{};

                    for (final s in itemsStocks) {
                      final qty = (s['quantity'] as int?) ?? 0;
                      final pName = s['product']?['name']?.toString() ?? 'Produk';
                      final pSku = s['product']?['sku']?.toString() ?? '';
                      
                      if (qty < 10) {
                        currentLowStockSkus.add(pSku);
                        if (!_warnedLowStockSkus.contains(pSku)) {
                          lowStockItems.add('$pName ($qty)');
                        }
                      }
                    }

                    // Bersihkan warned set jika stok sudah kembali normal
                    _warnedLowStockSkus.removeWhere((sku) => !currentLowStockSkus.contains(sku));

                    if (lowStockItems.isNotEmpty) {
                       // Gunakan post frame callback agar tidak error saat build
                       WidgetsBinding.instance.addPostFrameCallback((_) {
                          // Pastikan dialog tidak muncul berulang kali jika user belum menutup atau baru saja muncul
                          // Kita tandai item ini sudah di-warn
                          for (final s in itemsStocks) {
                             final pSku = s['product']?['sku']?.toString() ?? '';
                             final qty = (s['quantity'] as int?) ?? 0;
                             if (qty < 10) {
                               _warnedLowStockSkus.add(pSku);
                             }
                          }
                          
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Peringatan Stok Menipis!', style: TextStyle(color: Colors.red)),
                              content: SingleChildScrollView(
                                child: ListBody(
                                  children: [
                                    const Text('Produk berikut memiliki stok kurang dari 10. Harap segera restock/inbound!'),
                                    const SizedBox(height: 10),
                                    ...lowStockItems.map((item) => Text('• $item', style: const TextStyle(fontWeight: FontWeight.bold))),
                                  ],
                                ),
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  child: const Text('OK, Saya Mengerti'),
                                ),
                              ],
                            ),
                          );
                       });
                    }
                    // ---------------------------------------------

                    return Column(
                      children: [
                        Container(
                          decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(8)),
                          child: Column(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                color: Colors.grey.shade200,
                                child: Row(
                                  children: const [
                                    Expanded(child: Text('SKU', style: TextStyle(fontWeight: FontWeight.bold))),
                                    Expanded(child: Text('Nama', style: TextStyle(fontWeight: FontWeight.bold))),
                                    SizedBox(width: 80, child: Text('Qty', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold))),
                                  ],
                                ),
                              ),
                              for (final s in itemsStocks)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey.shade200))),
                                  child: Row(
                                    children: [
                                      Expanded(child: Text((s['product']?['sku']?.toString() ?? '-'))),
                                      Expanded(child: Text((s['product']?['name']?.toString() ?? '-'))),
                                      SizedBox(width: 80, child: Text((s['quantity']?.toString() ?? '0'), textAlign: TextAlign.right)),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
