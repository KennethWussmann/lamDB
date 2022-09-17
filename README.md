<div align="center">
  <h1><code>cdk-lib-template</code></h1>

  <p>
    <strong>Template for a new cdk-lib monorepo</strong>
  </p>
</div>

## Checklist

> Make sure to follow these steps after creating a fresh monorepo:

1. Clone and run `npm i`
2. Update all dependencies `npm run update-dependencies`
3. Grant this repository permission to get AWS credentials
4. Add `AWS_ROLE_ARN` and `AWS_REGION` secrets
5. Enable deployment by renaming `.github/workflows/deploy.yml.disabled`
6. Rename the packages in all `package.json` files
7. Tidy up this README
