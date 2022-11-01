import { buildSchema } from 'graphql';

export const testSchemaSdl = `input NestedIntFilter {
  equals: Int
  in: [Int]
  notIn: [Int]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntFilter
}

input IntFilter {
  equals: Int
  in: [Int]
  notIn: [Int]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntFilter
}

input NestedStringFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringFilter
}

input StringFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringFilter
}

input NestedStringNullableFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringNullableFilter
}

input StringNullableFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringNullableFilter
}

input ArticleWhereInput {
  AND: ArticleWhereInput
  OR: [ArticleWhereInput]
  NOT: ArticleWhereInput
  id: IntFilter
  url: StringFilter
  title: StringFilter
  subtitle: StringNullableFilter
  publication: StringFilter
  readingTime: IntFilter
  claps: IntFilter
}

enum SortOrder {
  asc
  desc
}

input ArticleOrderByWithRelationInput {
  id: SortOrder
  url: SortOrder
  title: SortOrder
  subtitle: SortOrder
  publication: SortOrder
  readingTime: SortOrder
  claps: SortOrder
}

input ArticleWhereUniqueInput {
  id: Int
}

enum ArticleScalarFieldEnum {
  id
  url
  title
  subtitle
  publication
  readingTime
  claps
}

type Article {
  id: Int!
  url: String!
  title: String!
  subtitle: String
  publication: String!
  readingTime: Int!
  claps: Int!
}

type ArticleCountAggregateOutputType {
  id: Int!
  url: Int!
  title: Int!
  subtitle: Int!
  publication: Int!
  readingTime: Int!
  claps: Int!
  _all: Int!
}

type ArticleAvgAggregateOutputType {
  id: Float
  readingTime: Float
  claps: Float
}

type ArticleSumAggregateOutputType {
  id: Int
  readingTime: Int
  claps: Int
}

type ArticleMinAggregateOutputType {
  id: Int
  url: String
  title: String
  subtitle: String
  publication: String
  readingTime: Int
  claps: Int
}

type ArticleMaxAggregateOutputType {
  id: Int
  url: String
  title: String
  subtitle: String
  publication: String
  readingTime: Int
  claps: Int
}

type AggregateArticle {
  _count: ArticleCountAggregateOutputType
  _avg: ArticleAvgAggregateOutputType
  _sum: ArticleSumAggregateOutputType
  _min: ArticleMinAggregateOutputType
  _max: ArticleMaxAggregateOutputType
}

input ArticleCountOrderByAggregateInput {
  id: SortOrder
  url: SortOrder
  title: SortOrder
  subtitle: SortOrder
  publication: SortOrder
  readingTime: SortOrder
  claps: SortOrder
}

input ArticleAvgOrderByAggregateInput {
  id: SortOrder
  readingTime: SortOrder
  claps: SortOrder
}

input ArticleMaxOrderByAggregateInput {
  id: SortOrder
  url: SortOrder
  title: SortOrder
  subtitle: SortOrder
  publication: SortOrder
  readingTime: SortOrder
  claps: SortOrder
}

input ArticleMinOrderByAggregateInput {
  id: SortOrder
  url: SortOrder
  title: SortOrder
  subtitle: SortOrder
  publication: SortOrder
  readingTime: SortOrder
  claps: SortOrder
}

input ArticleSumOrderByAggregateInput {
  id: SortOrder
  readingTime: SortOrder
  claps: SortOrder
}

input ArticleOrderByWithAggregationInput {
  id: SortOrder
  url: SortOrder
  title: SortOrder
  subtitle: SortOrder
  publication: SortOrder
  readingTime: SortOrder
  claps: SortOrder
  _count: ArticleCountOrderByAggregateInput
  _avg: ArticleAvgOrderByAggregateInput
  _max: ArticleMaxOrderByAggregateInput
  _min: ArticleMinOrderByAggregateInput
  _sum: ArticleSumOrderByAggregateInput
}

input NestedFloatFilter {
  equals: Float
  in: [Float]
  notIn: [Float]
  lt: Float
  lte: Float
  gt: Float
  gte: Float
  not: NestedFloatFilter
}

input NestedIntWithAggregatesFilter {
  equals: Int
  in: [Int]
  notIn: [Int]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntWithAggregatesFilter
  _count: NestedIntFilter
  _avg: NestedFloatFilter
  _sum: NestedIntFilter
  _min: NestedIntFilter
  _max: NestedIntFilter
}

input IntWithAggregatesFilter {
  equals: Int
  in: [Int]
  notIn: [Int]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntWithAggregatesFilter
  _count: NestedIntFilter
  _avg: NestedFloatFilter
  _sum: NestedIntFilter
  _min: NestedIntFilter
  _max: NestedIntFilter
}

input NestedStringWithAggregatesFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringWithAggregatesFilter
  _count: NestedIntFilter
  _min: NestedStringFilter
  _max: NestedStringFilter
}

input StringWithAggregatesFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringWithAggregatesFilter
  _count: NestedIntFilter
  _min: NestedStringFilter
  _max: NestedStringFilter
}

input NestedIntNullableFilter {
  equals: Int
  in: [Int]
  notIn: [Int]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntNullableFilter
}

input NestedStringNullableWithAggregatesFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringNullableWithAggregatesFilter
  _count: NestedIntNullableFilter
  _min: NestedStringNullableFilter
  _max: NestedStringNullableFilter
}

input StringNullableWithAggregatesFilter {
  equals: String
  in: [String]
  notIn: [String]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringNullableWithAggregatesFilter
  _count: NestedIntNullableFilter
  _min: NestedStringNullableFilter
  _max: NestedStringNullableFilter
}

input ArticleScalarWhereWithAggregatesInput {
  AND: ArticleScalarWhereWithAggregatesInput
  OR: [ArticleScalarWhereWithAggregatesInput]
  NOT: ArticleScalarWhereWithAggregatesInput
  id: IntWithAggregatesFilter
  url: StringWithAggregatesFilter
  title: StringWithAggregatesFilter
  subtitle: StringNullableWithAggregatesFilter
  publication: StringWithAggregatesFilter
  readingTime: IntWithAggregatesFilter
  claps: IntWithAggregatesFilter
}

type ArticleGroupByOutputType {
  id: Int!
  url: String!
  title: String!
  subtitle: String
  publication: String!
  readingTime: Int!
  claps: Int!
  _count: ArticleCountAggregateOutputType
  _avg: ArticleAvgAggregateOutputType
  _sum: ArticleSumAggregateOutputType
  _min: ArticleMinAggregateOutputType
  _max: ArticleMaxAggregateOutputType
}

type Query {
  findFirstArticle(
    where: ArticleWhereInput
    orderBy: [ArticleOrderByWithRelationInput]
    cursor: ArticleWhereUniqueInput
    take: Int
    skip: Int
    distinct: [ArticleScalarFieldEnum]
  ): Article
  findManyArticle(
    where: ArticleWhereInput
    orderBy: [ArticleOrderByWithRelationInput]
    cursor: ArticleWhereUniqueInput
    take: Int
    skip: Int
    distinct: [ArticleScalarFieldEnum]
  ): [Article]!
  aggregateArticle(
    where: ArticleWhereInput
    orderBy: [ArticleOrderByWithRelationInput]
    cursor: ArticleWhereUniqueInput
    take: Int
    skip: Int
  ): AggregateArticle!
  groupByArticle(
    where: ArticleWhereInput
    orderBy: [ArticleOrderByWithAggregationInput]
    by: [ArticleScalarFieldEnum]!
    having: ArticleScalarWhereWithAggregatesInput
    take: Int
    skip: Int
  ): [ArticleGroupByOutputType]!
  findUniqueArticle(where: ArticleWhereUniqueInput!): Article
}

input ArticleCreateInput {
  url: String!
  title: String!
  subtitle: String
  publication: String!
  readingTime: Int!
  claps: Int!
}

input StringFieldUpdateOperationsInput {
  set: String
}

input NullableStringFieldUpdateOperationsInput {
  set: String
}

input IntFieldUpdateOperationsInput {
  set: Int
  increment: Int
  decrement: Int
  multiply: Int
  divide: Int
}

input ArticleUpdateInput {
  url: StringFieldUpdateOperationsInput
  title: StringFieldUpdateOperationsInput
  subtitle: NullableStringFieldUpdateOperationsInput
  publication: StringFieldUpdateOperationsInput
  readingTime: IntFieldUpdateOperationsInput
  claps: IntFieldUpdateOperationsInput
}

input ArticleUpdateManyMutationInput {
  url: StringFieldUpdateOperationsInput
  title: StringFieldUpdateOperationsInput
  subtitle: NullableStringFieldUpdateOperationsInput
  publication: StringFieldUpdateOperationsInput
  readingTime: IntFieldUpdateOperationsInput
  claps: IntFieldUpdateOperationsInput
}

type AffectedRowsOutput {
  count: Int!
}

type Mutation {
  createOneArticle(data: ArticleCreateInput!): Article!
  upsertOneArticle(where: ArticleWhereUniqueInput!, create: ArticleCreateInput!, update: ArticleUpdateInput!): Article!
  deleteOneArticle(where: ArticleWhereUniqueInput!): Article
  updateOneArticle(data: ArticleUpdateInput!, where: ArticleWhereUniqueInput!): Article
  updateManyArticle(data: ArticleUpdateManyMutationInput!, where: ArticleWhereInput): AffectedRowsOutput!
  deleteManyArticle(where: ArticleWhereInput): AffectedRowsOutput!
  executeRaw(query: String!, parameters: Json): Json!
  queryRaw(query: String!, parameters: Json): Json!
}

scalar DateTime
scalar Json
scalar UUID
scalar BigInt
scalar Decimal
scalar Bytes
`;

export const testSchema = buildSchema(testSchemaSdl);
