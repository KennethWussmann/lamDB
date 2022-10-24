/* eslint-disable */
// @ts-nocheck
import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  BigInt: any;
  Bytes: any;
  DateTime: any;
  Decimal: any;
  Json: any;
  UUID: any;
};

export type AffectedRowsOutput = {
  __typename?: 'AffectedRowsOutput';
  count: Scalars['Int'];
};

export type AggregateArticle = {
  __typename?: 'AggregateArticle';
  _avg?: Maybe<ArticleAvgAggregateOutputType>;
  _count?: Maybe<ArticleCountAggregateOutputType>;
  _max?: Maybe<ArticleMaxAggregateOutputType>;
  _min?: Maybe<ArticleMinAggregateOutputType>;
  _sum?: Maybe<ArticleSumAggregateOutputType>;
};

export type Article = {
  __typename?: 'Article';
  claps?: Maybe<Scalars['Int']>;
  id: Scalars['Int'];
  publication: Scalars['String'];
  readingTime?: Maybe<Scalars['Int']>;
  subtitle?: Maybe<Scalars['String']>;
  title: Scalars['String'];
  url: Scalars['String'];
};

export type ArticleAvgAggregateOutputType = {
  __typename?: 'ArticleAvgAggregateOutputType';
  claps?: Maybe<Scalars['Float']>;
  id?: Maybe<Scalars['Float']>;
  readingTime?: Maybe<Scalars['Float']>;
};

export type ArticleAvgOrderByAggregateInput = {
  claps?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  readingTime?: InputMaybe<SortOrder>;
};

export type ArticleCountAggregateOutputType = {
  __typename?: 'ArticleCountAggregateOutputType';
  _all: Scalars['Int'];
  claps: Scalars['Int'];
  id: Scalars['Int'];
  publication: Scalars['Int'];
  readingTime: Scalars['Int'];
  subtitle: Scalars['Int'];
  title: Scalars['Int'];
  url: Scalars['Int'];
};

export type ArticleCountOrderByAggregateInput = {
  claps?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  publication?: InputMaybe<SortOrder>;
  readingTime?: InputMaybe<SortOrder>;
  subtitle?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
  url?: InputMaybe<SortOrder>;
};

export type ArticleCreateInput = {
  claps?: InputMaybe<Scalars['Int']>;
  publication: Scalars['String'];
  readingTime?: InputMaybe<Scalars['Int']>;
  subtitle?: InputMaybe<Scalars['String']>;
  title: Scalars['String'];
  url: Scalars['String'];
};

export type ArticleGroupByOutputType = {
  __typename?: 'ArticleGroupByOutputType';
  _avg?: Maybe<ArticleAvgAggregateOutputType>;
  _count?: Maybe<ArticleCountAggregateOutputType>;
  _max?: Maybe<ArticleMaxAggregateOutputType>;
  _min?: Maybe<ArticleMinAggregateOutputType>;
  _sum?: Maybe<ArticleSumAggregateOutputType>;
  claps?: Maybe<Scalars['Int']>;
  id: Scalars['Int'];
  publication: Scalars['String'];
  readingTime?: Maybe<Scalars['Int']>;
  subtitle?: Maybe<Scalars['String']>;
  title: Scalars['String'];
  url: Scalars['String'];
};

export type ArticleMaxAggregateOutputType = {
  __typename?: 'ArticleMaxAggregateOutputType';
  claps?: Maybe<Scalars['Int']>;
  id?: Maybe<Scalars['Int']>;
  publication?: Maybe<Scalars['String']>;
  readingTime?: Maybe<Scalars['Int']>;
  subtitle?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  url?: Maybe<Scalars['String']>;
};

export type ArticleMaxOrderByAggregateInput = {
  claps?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  publication?: InputMaybe<SortOrder>;
  readingTime?: InputMaybe<SortOrder>;
  subtitle?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
  url?: InputMaybe<SortOrder>;
};

export type ArticleMinAggregateOutputType = {
  __typename?: 'ArticleMinAggregateOutputType';
  claps?: Maybe<Scalars['Int']>;
  id?: Maybe<Scalars['Int']>;
  publication?: Maybe<Scalars['String']>;
  readingTime?: Maybe<Scalars['Int']>;
  subtitle?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  url?: Maybe<Scalars['String']>;
};

export type ArticleMinOrderByAggregateInput = {
  claps?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  publication?: InputMaybe<SortOrder>;
  readingTime?: InputMaybe<SortOrder>;
  subtitle?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
  url?: InputMaybe<SortOrder>;
};

export type ArticleOrderByWithAggregationInput = {
  _avg?: InputMaybe<ArticleAvgOrderByAggregateInput>;
  _count?: InputMaybe<ArticleCountOrderByAggregateInput>;
  _max?: InputMaybe<ArticleMaxOrderByAggregateInput>;
  _min?: InputMaybe<ArticleMinOrderByAggregateInput>;
  _sum?: InputMaybe<ArticleSumOrderByAggregateInput>;
  claps?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  publication?: InputMaybe<SortOrder>;
  readingTime?: InputMaybe<SortOrder>;
  subtitle?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
  url?: InputMaybe<SortOrder>;
};

export type ArticleOrderByWithRelationInput = {
  claps?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  publication?: InputMaybe<SortOrder>;
  readingTime?: InputMaybe<SortOrder>;
  subtitle?: InputMaybe<SortOrder>;
  title?: InputMaybe<SortOrder>;
  url?: InputMaybe<SortOrder>;
};

export enum ArticleScalarFieldEnum {
  Claps = 'claps',
  Id = 'id',
  Publication = 'publication',
  ReadingTime = 'readingTime',
  Subtitle = 'subtitle',
  Title = 'title',
  Url = 'url',
}

export type ArticleScalarWhereWithAggregatesInput = {
  AND?: InputMaybe<ArticleScalarWhereWithAggregatesInput>;
  NOT?: InputMaybe<ArticleScalarWhereWithAggregatesInput>;
  OR?: InputMaybe<Array<InputMaybe<ArticleScalarWhereWithAggregatesInput>>>;
  claps?: InputMaybe<IntNullableWithAggregatesFilter>;
  id?: InputMaybe<IntWithAggregatesFilter>;
  publication?: InputMaybe<StringWithAggregatesFilter>;
  readingTime?: InputMaybe<IntNullableWithAggregatesFilter>;
  subtitle?: InputMaybe<StringNullableWithAggregatesFilter>;
  title?: InputMaybe<StringWithAggregatesFilter>;
  url?: InputMaybe<StringWithAggregatesFilter>;
};

export type ArticleSumAggregateOutputType = {
  __typename?: 'ArticleSumAggregateOutputType';
  claps?: Maybe<Scalars['Int']>;
  id?: Maybe<Scalars['Int']>;
  readingTime?: Maybe<Scalars['Int']>;
};

export type ArticleSumOrderByAggregateInput = {
  claps?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  readingTime?: InputMaybe<SortOrder>;
};

export type ArticleUpdateInput = {
  claps?: InputMaybe<NullableIntFieldUpdateOperationsInput>;
  publication?: InputMaybe<StringFieldUpdateOperationsInput>;
  readingTime?: InputMaybe<NullableIntFieldUpdateOperationsInput>;
  subtitle?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
  url?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type ArticleUpdateManyMutationInput = {
  claps?: InputMaybe<NullableIntFieldUpdateOperationsInput>;
  publication?: InputMaybe<StringFieldUpdateOperationsInput>;
  readingTime?: InputMaybe<NullableIntFieldUpdateOperationsInput>;
  subtitle?: InputMaybe<NullableStringFieldUpdateOperationsInput>;
  title?: InputMaybe<StringFieldUpdateOperationsInput>;
  url?: InputMaybe<StringFieldUpdateOperationsInput>;
};

export type ArticleWhereInput = {
  AND?: InputMaybe<ArticleWhereInput>;
  NOT?: InputMaybe<ArticleWhereInput>;
  OR?: InputMaybe<Array<InputMaybe<ArticleWhereInput>>>;
  claps?: InputMaybe<IntNullableFilter>;
  id?: InputMaybe<IntFilter>;
  publication?: InputMaybe<StringFilter>;
  readingTime?: InputMaybe<IntNullableFilter>;
  subtitle?: InputMaybe<StringNullableFilter>;
  title?: InputMaybe<StringFilter>;
  url?: InputMaybe<StringFilter>;
};

export type ArticleWhereUniqueInput = {
  id?: InputMaybe<Scalars['Int']>;
};

export type IntFilter = {
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type IntNullableFilter = {
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntNullableFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type IntNullableWithAggregatesFilter = {
  _avg?: InputMaybe<NestedFloatNullableFilter>;
  _count?: InputMaybe<NestedIntNullableFilter>;
  _max?: InputMaybe<NestedIntNullableFilter>;
  _min?: InputMaybe<NestedIntNullableFilter>;
  _sum?: InputMaybe<NestedIntNullableFilter>;
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntNullableWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type IntWithAggregatesFilter = {
  _avg?: InputMaybe<NestedFloatFilter>;
  _count?: InputMaybe<NestedIntFilter>;
  _max?: InputMaybe<NestedIntFilter>;
  _min?: InputMaybe<NestedIntFilter>;
  _sum?: InputMaybe<NestedIntFilter>;
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createOneArticle: Article;
  deleteManyArticle: AffectedRowsOutput;
  deleteOneArticle?: Maybe<Article>;
  executeRaw: Scalars['Json'];
  queryRaw: Scalars['Json'];
  updateManyArticle: AffectedRowsOutput;
  updateOneArticle?: Maybe<Article>;
  upsertOneArticle: Article;
};

export type MutationCreateOneArticleArgs = {
  data: ArticleCreateInput;
};

export type MutationDeleteManyArticleArgs = {
  where?: InputMaybe<ArticleWhereInput>;
};

export type MutationDeleteOneArticleArgs = {
  where: ArticleWhereUniqueInput;
};

export type MutationExecuteRawArgs = {
  parameters?: InputMaybe<Scalars['Json']>;
  query: Scalars['String'];
};

export type MutationQueryRawArgs = {
  parameters?: InputMaybe<Scalars['Json']>;
  query: Scalars['String'];
};

export type MutationUpdateManyArticleArgs = {
  data: ArticleUpdateManyMutationInput;
  where?: InputMaybe<ArticleWhereInput>;
};

export type MutationUpdateOneArticleArgs = {
  data: ArticleUpdateInput;
  where: ArticleWhereUniqueInput;
};

export type MutationUpsertOneArticleArgs = {
  create: ArticleCreateInput;
  update: ArticleUpdateInput;
  where: ArticleWhereUniqueInput;
};

export type NestedFloatFilter = {
  equals?: InputMaybe<Scalars['Float']>;
  gt?: InputMaybe<Scalars['Float']>;
  gte?: InputMaybe<Scalars['Float']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Float']>>>;
  lt?: InputMaybe<Scalars['Float']>;
  lte?: InputMaybe<Scalars['Float']>;
  not?: InputMaybe<NestedFloatFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Float']>>>;
};

export type NestedFloatNullableFilter = {
  equals?: InputMaybe<Scalars['Float']>;
  gt?: InputMaybe<Scalars['Float']>;
  gte?: InputMaybe<Scalars['Float']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Float']>>>;
  lt?: InputMaybe<Scalars['Float']>;
  lte?: InputMaybe<Scalars['Float']>;
  not?: InputMaybe<NestedFloatNullableFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Float']>>>;
};

export type NestedIntFilter = {
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type NestedIntNullableFilter = {
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntNullableFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type NestedIntNullableWithAggregatesFilter = {
  _avg?: InputMaybe<NestedFloatNullableFilter>;
  _count?: InputMaybe<NestedIntNullableFilter>;
  _max?: InputMaybe<NestedIntNullableFilter>;
  _min?: InputMaybe<NestedIntNullableFilter>;
  _sum?: InputMaybe<NestedIntNullableFilter>;
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntNullableWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type NestedIntWithAggregatesFilter = {
  _avg?: InputMaybe<NestedFloatFilter>;
  _count?: InputMaybe<NestedIntFilter>;
  _max?: InputMaybe<NestedIntFilter>;
  _min?: InputMaybe<NestedIntFilter>;
  _sum?: InputMaybe<NestedIntFilter>;
  equals?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  not?: InputMaybe<NestedIntWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
};

export type NestedStringFilter = {
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type NestedStringNullableFilter = {
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringNullableFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type NestedStringNullableWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntNullableFilter>;
  _max?: InputMaybe<NestedStringNullableFilter>;
  _min?: InputMaybe<NestedStringNullableFilter>;
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringNullableWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type NestedStringWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntFilter>;
  _max?: InputMaybe<NestedStringFilter>;
  _min?: InputMaybe<NestedStringFilter>;
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type NullableIntFieldUpdateOperationsInput = {
  decrement?: InputMaybe<Scalars['Int']>;
  divide?: InputMaybe<Scalars['Int']>;
  increment?: InputMaybe<Scalars['Int']>;
  multiply?: InputMaybe<Scalars['Int']>;
  set?: InputMaybe<Scalars['Int']>;
};

export type NullableStringFieldUpdateOperationsInput = {
  set?: InputMaybe<Scalars['String']>;
};

export type Query = {
  __typename?: 'Query';
  aggregateArticle: AggregateArticle;
  findFirstArticle?: Maybe<Article>;
  findManyArticle: Array<Maybe<Article>>;
  findUniqueArticle?: Maybe<Article>;
  groupByArticle: Array<Maybe<ArticleGroupByOutputType>>;
};

export type QueryAggregateArticleArgs = {
  cursor?: InputMaybe<ArticleWhereUniqueInput>;
  orderBy?: InputMaybe<Array<InputMaybe<ArticleOrderByWithRelationInput>>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<ArticleWhereInput>;
};

export type QueryFindFirstArticleArgs = {
  cursor?: InputMaybe<ArticleWhereUniqueInput>;
  distinct?: InputMaybe<Array<InputMaybe<ArticleScalarFieldEnum>>>;
  orderBy?: InputMaybe<Array<InputMaybe<ArticleOrderByWithRelationInput>>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<ArticleWhereInput>;
};

export type QueryFindManyArticleArgs = {
  cursor?: InputMaybe<ArticleWhereUniqueInput>;
  distinct?: InputMaybe<Array<InputMaybe<ArticleScalarFieldEnum>>>;
  orderBy?: InputMaybe<Array<InputMaybe<ArticleOrderByWithRelationInput>>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<ArticleWhereInput>;
};

export type QueryFindUniqueArticleArgs = {
  where: ArticleWhereUniqueInput;
};

export type QueryGroupByArticleArgs = {
  by: Array<InputMaybe<ArticleScalarFieldEnum>>;
  having?: InputMaybe<ArticleScalarWhereWithAggregatesInput>;
  orderBy?: InputMaybe<Array<InputMaybe<ArticleOrderByWithAggregationInput>>>;
  skip?: InputMaybe<Scalars['Int']>;
  take?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<ArticleWhereInput>;
};

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export type StringFieldUpdateOperationsInput = {
  set?: InputMaybe<Scalars['String']>;
};

export type StringFilter = {
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type StringNullableFilter = {
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringNullableFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type StringNullableWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntNullableFilter>;
  _max?: InputMaybe<NestedStringNullableFilter>;
  _min?: InputMaybe<NestedStringNullableFilter>;
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringNullableWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type StringWithAggregatesFilter = {
  _count?: InputMaybe<NestedIntFilter>;
  _max?: InputMaybe<NestedStringFilter>;
  _min?: InputMaybe<NestedStringFilter>;
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  equals?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  not?: InputMaybe<NestedStringWithAggregatesFilter>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type FindArticlesQueryVariables = Exact<{
  where?: InputMaybe<ArticleWhereInput>;
  orderBy?: InputMaybe<
    Array<InputMaybe<ArticleOrderByWithRelationInput>> | InputMaybe<ArticleOrderByWithRelationInput>
  >;
  cursor?: InputMaybe<ArticleWhereUniqueInput>;
  take?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
  distinct?: InputMaybe<Array<InputMaybe<ArticleScalarFieldEnum>> | InputMaybe<ArticleScalarFieldEnum>>;
}>;

export type FindArticlesQuery = {
  __typename?: 'Query';
  findManyArticle: Array<{
    __typename?: 'Article';
    id: number;
    url: string;
    title: string;
    subtitle?: string | null;
    publication: string;
    claps?: number | null;
  } | null>;
};

export const FindArticlesDocument = gql`
  query findArticles(
    $where: ArticleWhereInput
    $orderBy: [ArticleOrderByWithRelationInput]
    $cursor: ArticleWhereUniqueInput
    $take: Int
    $skip: Int
    $distinct: [ArticleScalarFieldEnum]
  ) {
    findManyArticle(where: $where, orderBy: $orderBy, cursor: $cursor, take: $take, skip: $skip, distinct: $distinct) {
      id
      url
      title
      subtitle
      publication
      claps
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    findArticles(
      variables?: FindArticlesQueryVariables,
      requestHeaders?: Dom.RequestInit['headers'],
    ): Promise<FindArticlesQuery> {
      return withWrapper(
        (wrappedRequestHeaders) =>
          client.request<FindArticlesQuery>(FindArticlesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'findArticles',
        'query',
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
