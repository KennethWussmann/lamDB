# Motivation

## Why do we need a "new" database?

While there are indeed great database technologies out there with better performance, more robust designs that scale better and have more features, there are two key factors that made me start this project.

### State of relational serverless databases

Serverless as in:

- No infrastructure maintenance
- Scale to zero
- Pay for what you use
- No need to worry about scaling, backups, security, updates, etc.

There recently have been quite some developments in regards to true serverless databases. Cloudflare for example [started the closed beta of D1](https://blog.cloudflare.com/introducing-d1/), a very similar approach to lamDB also using SQLite. But I bet a lot more performant than lamDB.

Unfortunately, AWS is lacking behind. While I hope they still have a trick up their sleeve, they also just released [Serverless Aurora V2](https://aws.amazon.com/rds/aurora/serverless/). Dispite the name, [it is not really serverless](https://www.lastweekinaws.com/blog/no-aws-aurora-serverless-v2-is-not-serverless/). Also their older Serverless Aurora V1 does not really give you serverless vibes when you need to trigger the Postgres 10 to Postgres 11 upgrade yourself and accept the 15 minutes of downtime. At least it scales to zero, with a lot of cold-start of course.
The tooling for Aurora Serverless V1 though, is a little limited.

Of course there are some open-source alternatives that fall in that area.

Also the non-relational options are great. DynamoDB is a great key-value store, as serverless as serverless can get, but it's not a relational database. While this is fine for the majority of use-cases, and my go-to choice, there are some cases that require a relational database - or at least a database with more query options than just keys.

In such cases I often liked to use services like Algolia, with awesome response times and great search capabilities. Not a relational database either, but great to add query capabilities that I sometimes needed.

### Does it need to be serverless

It depends of course. But if the application is serverless and the database is not, it sometimes can get tricky. The speed in which AWS Lambda scales up can often impact the database performance drastically as each instance requires an own open database connection.

Also servers are usually a lot more expensive. A managed database on AWS can cost around $30 per month. Which, to me, does not sound great if the actual serverless application using it only costs $3 per month. That's why usually DynamoDB is the go-to choice for serverless applications, because it's pay-per-use and scales with the demand. Perfect to start small and scale big later.

## LamDB the silver bullet

Oh, please no. I don't want to make any claims that lamDB is the silver bullet for all your problems. It's not. It's just a database that I needed for my own projects and I thought it might be useful for others as well. It perfectly fits into my serverless needs, where I don't need to handle huge loads and don't want to rob the bank.

I wanted something simple, on AWS, something that can handle small load and is pay-per-use.
For something like that I'm willing to sacrafice a little bit of performance and features. Like the longer cold-starts.

If this summerizes your needs as well, then you might want to give lamDB a try. Otherwise I recommend to check out the other great options out there. Some mentioned above, Aurora Serverless V1 is actually not that bad.
