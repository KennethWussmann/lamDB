# @lamdb/api-token-authorizer

Lambda funcation that can be used as an API Gateway authorizer to authenticate requests with an API token. Also contains a Secrets Manager rotation function that can be used to rotate the API token.

Distributed via an own package to avoid it's runtime dependencies to be included in the `@lamdb/lambda` package.
