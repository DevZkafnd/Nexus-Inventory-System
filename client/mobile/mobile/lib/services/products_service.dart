import 'package:graphql_flutter/graphql_flutter.dart';

class ProductsService {
  final GraphQLClient client;
  ProductsService(this.client);

  QueryOptions productsOptions() {
    return QueryOptions(
      document: gql('query { products { id name sku } }'),
      fetchPolicy: FetchPolicy.cacheAndNetwork,
    );
  }

  QueryOptions productBySkuOptions(String sku) {
    return QueryOptions(
      document: gql('query ProductBySku(\$sku: String!) { productBySku(sku: \$sku) { id name sku } }'),
      variables: {'sku': sku},
      fetchPolicy: FetchPolicy.networkOnly,
    );
  }
}
