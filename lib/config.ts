const DEFAULT_PREFIX = "meal-manager";

const mockFlag = process.env.MOCK_DYNAMO_DB === "true";
const forceDynamo = process.env.MOCK_DYNAMO_DB === "false";
const hasAwsRegion = Boolean(process.env.AWS_REGION);

export const appConfig = {
  useMockDb: mockFlag || (!forceDynamo && !hasAwsRegion),
  tableNames: {
    ingredients:
      process.env.DYNAMODB_INGREDIENTS_TABLE ??
      `${DEFAULT_PREFIX}-ingredients`,
    sales:
      process.env.DYNAMODB_SALES_TABLE ?? `${DEFAULT_PREFIX}-sales`,
    familyProfiles:
      process.env.DYNAMODB_FAMILY_PROFILES_TABLE ??
      `${DEFAULT_PREFIX}-family-profiles`,
  },
};
