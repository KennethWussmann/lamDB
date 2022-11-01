import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client/edge';
import { getDatabaseUrl } from './auth';

const requestSchema = z.object({
  query: z.string(),
});

/**
 * This is an example Lambda Handler that integrates with our LamDB to search for Medium articles in our database.
 */
export const search = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Retrieve the database url with the API token
  const databaseUrl = await getDatabaseUrl();

  // Create a normal PrismaClient
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    // Safely parse request body
    const request = requestSchema.parse(event.body ? JSON.parse(event.body) : {});

    // Use the Prisma client to fetch articles from lamDB
    const articles = await prisma.article.findMany({
      where: {
        title: {
          contains: request.query,
        },
      },
    });

    // Return succesful response with articles found
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
    // Return error if request body was invalid
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: 'Invalid request',
      }),
    };
  }
};
