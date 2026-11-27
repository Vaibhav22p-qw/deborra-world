const item = `
  title handle productType availableForSale
  featuredImage { url altText }
  priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
`;
const connection = `nodes { ${item} } pageInfo { hasNextPage endCursor }`;

export function storeDocument(operation, values = {}) {
  switch (operation) {
    case 'products':
      return {
        document: `query DeborraShop($size: Int!, $after: String) @inContext(country: IN) {
          products(first: $size, after: $after) { ${connection} }
        }`,
        variables: { size: values.size, after: values.after }
      };
    case 'collection':
      return {
        document: `query DeborraCollection($handle: String!, $size: Int!, $after: String) @inContext(country: IN) {
          collection(handle: $handle) { title description products(first: $size, after: $after) { ${connection} } }
        }`,
        variables: { handle: values.handle, size: values.size, after: values.after }
      };
    case 'categories': {
      const definitions = values.handles.map((_, index) => `$handle${index}: String!`).join(', ');
      const selections = values.handles.map((_, index) =>
        `category${index}: collection(handle: $handle${index}) { handle title products(first: 1) { nodes { id } } }`).join('\n');
      return {
        document: `query DeborraCategories(${definitions}) @inContext(country: IN) { ${selections} }`,
        variables: Object.fromEntries(values.handles.map((handle, index) => [`handle${index}`, handle]))
      };
    }
    case 'product':
      return {
        document: `query DeborraProduct($handle: String!) @inContext(country: IN) {
          product(handle: $handle) {
            title description productType featuredImage { url altText }
            ingredients: metafield(namespace: "deborra", key: "ingredients") { value }
            directions: metafield(namespace: "deborra", key: "directions") { value }
            warnings: metafield(namespace: "deborra", key: "warnings") { value }
            faq: metafield(namespace: "deborra", key: "faq") { value }
            variants(first: 250) { nodes {
              id title availableForSale currentlyNotInStock quantityAvailable
              image { url altText } price { amount currencyCode }
            } }
          }
        }`,
        variables: { handle: values.handle }
      };
    case 'policies':
      return {
        document: `query DeborraPolicies { shop {
          shippingPolicy { url } refundPolicy { url } privacyPolicy { url } termsOfService { url }
        } }`,
        variables: {}
      };
    default: throw new Error('Unknown storefront operation');
  }
}
