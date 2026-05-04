import companies from "~/config/companies.json";
import type { CompanyConfig } from "~/types";

export default defineEventHandler(() => {
  return validateCompanyConfigs(companies);
});

const COMPANY_CONFIG_KEYS = [
  "id",
  "name",
  "vendorName",
  "nameOrder",
  "nameLocation",
  "hoursFieldLabel",
  "hoursFieldCode",
  "dailyColumn",
  "extraColumn",
  "summaryLabel",
  "outputTemplatePath",
] as const satisfies readonly (keyof CompanyConfig)[];

const REQUIRED_STRING_KEYS = COMPANY_CONFIG_KEYS.filter(
  (key) => key !== "nameOrder",
);

function validateCompanyConfigs(value: unknown): CompanyConfig[] {
  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 500,
      statusMessage: "companies.json must contain an array",
    });
  }

  return value.map((company, index) => validateCompanyConfig(company, index));
}

function validateCompanyConfig(value: unknown, index: number): CompanyConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidCompany(index, "entry must be an object");
  }

  const company = value as Record<string, unknown>;
  const expectedKeys = new Set(COMPANY_CONFIG_KEYS);
  const actualKeys = Object.keys(company);
  const extraKeys = actualKeys.filter((key) => !expectedKeys.has(key as keyof CompanyConfig));
  const missingKeys = COMPANY_CONFIG_KEYS.filter((key) => !(key in company));

  if (extraKeys.length > 0) {
    throw invalidCompany(index, `unexpected field(s): ${extraKeys.join(", ")}`);
  }

  if (missingKeys.length > 0) {
    throw invalidCompany(index, `missing field(s): ${missingKeys.join(", ")}`);
  }

  for (const key of REQUIRED_STRING_KEYS) {
    if (typeof company[key] !== "string") {
      throw invalidCompany(index, `${key} must be a string`);
    }
  }

  if (
    company.nameOrder !== "surname_first" &&
    company.nameOrder !== "name_first"
  ) {
    throw invalidCompany(index, "nameOrder must be surname_first or name_first");
  }

  return company as unknown as CompanyConfig;
}

function invalidCompany(index: number, reason: string) {
  return createError({
    statusCode: 500,
    statusMessage: `Invalid companies.json entry at index ${index}: ${reason}`,
  });
}
