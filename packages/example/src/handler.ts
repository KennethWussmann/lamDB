import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client/edge';
import { setDatabaseUrl } from './auth';

const requestSchema = z.object({
  query: z.string(),
});

/**
 * This is an example Lambda Handler that integrates with our LamDB to search for Medium articles in our database.
 */
export const search = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // use LamDB connection string
  await setDatabaseUrl();

  // Create a normal PrismaClient
  const prisma = new PrismaClient();

  try {
    // safely parse request body
    const request = requestSchema.parse(event.body ? JSON.parse(event.body) : {});

    // Looks a lot like Prisma Client, but is a normal generated GraphQL SDK
    const articles = await prisma.article.findMany({
      where: {
        title: {
          contains: request.query,
        },
      },
    });

    // return succesful response with articles found
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          success: true,
          data: articles,
        },
        null,
        2,
      ),
    };
  } catch (e) {
    console.error('Request failed', e);
    // return error if request body was invalid
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: 'Invalid request',
      }),
    };
  }
};
