import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:graphql/client.dart' as gqlc;
import 'package:flutter/foundation.dart';

const String _apiUrlDefine = String.fromEnvironment('API_URL');
const String _defaultNgrok = 'https://dandyish-squirtingly-galen.ngrok-free.dev/';
const String _defaultLocal = 'http://10.0.2.2:4000/';

Future<String?> _getToken() async {
  final prefs = await SharedPreferences.getInstance();
  final t = prefs.getString('token');
  return (t == null || t.isEmpty) ? null : t;
}

GraphQLClient createGraphQLClient() {
  final baseUrl = _apiUrlDefine.isNotEmpty
      ? _apiUrlDefine
      : (kReleaseMode ? _defaultNgrok : _defaultLocal);
  final httpLink = HttpLink(baseUrl);
  final authLink = gqlc.AuthLink(
    headerKey: 'x-user-id',
    getToken: _getToken,
  );
  final link = authLink.concat(httpLink);
  return GraphQLClient(
    link: link,
    cache: GraphQLCache(store: InMemoryStore()),
  );
}
