# @lamdb/example

TypeScript project with CDK that showcases one way how to use `lamDB`.

Notice that while the `lamDB` CDK construct is currently only available for CDK powered by JavaScript & TypeScript, you can work with the deployed database from any language and tech stack. Even from outside of AWS. This project should just show one way to work with it.

## Content

- TypeScript project
- AWS CDK for infrastructure
  - Uses @lamdb/infrastructure to deploy a lamDB instance
- Uses vanilla @prisma/client for communication with lamDB
- Exposes REST interface for a frontend application to search lamDB
