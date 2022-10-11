# @lamdb/benchmark

k6 script to benchmark a lamDB instance running either on AWS or in Docker.

## Setup

```
# Follow the general delevopment instructions on the root readme

# Install k6 (https://k6.io/docs/getting-started/installation/)
brew install k6

# Configure lamDB root URL
echo "URL=http://localhost" > .env

# Start benchmark
npm start
```
