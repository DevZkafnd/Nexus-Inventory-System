import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Produk')),
      body: Query(
        options: QueryOptions(
          document: gql('query { products { id name } }'),
          fetchPolicy: FetchPolicy.cacheAndNetwork,
        ),
        builder: (result, {fetchMore, refetch}) {
          if (result.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (result.hasException) {
            return Center(child: Text(result.exception.toString()));
          }
          final List items = (result.data?['products'] as List?) ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('Tidak ada produk'));
          }
          return ListView.builder(
            itemCount: items.length,
            itemBuilder: (context, i) {
              final p = items[i] as Map<String, dynamic>;
              return ListTile(
                title: Text(p['name']?.toString() ?? ''),
                subtitle: Text(p['id']?.toString() ?? ''),
              );
            },
          );
        },
      ),
    );
  }
}
