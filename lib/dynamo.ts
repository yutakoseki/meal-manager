import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { appConfig } from "./config";

let documentClient: DynamoDBDocumentClient | null = null;

if (!appConfig.useMockDb) {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? "ap-northeast-1",
    endpoint: process.env.DYNAMODB_ENDPOINT,
  });

  documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export function getDocumentClient(): DynamoDBDocumentClient {
  if (!documentClient) {
    throw new Error("DynamoDB client is not configured for this environment.");
  }

  return documentClient;
}
