import { createRepositories } from "../repositories/index.js";
import { createAccountService } from "./account-service.js";
import { createCategoryService } from "./category-service.js";
import { createTransactionService } from "./transaction-service.js";
import { createBudgetService } from "./budget-service.js";
import { createAnalyticsService } from "./analytics-service.js";
import { createSettingsService } from "./settings-service.js";

// Composition root for future UI. Call openDatabase first and await every method.
export function createFinance(database) {
  const repositories = createRepositories(database);
  return {
    accounts: createAccountService(repositories),
    categories: createCategoryService(repositories),
    transactions: createTransactionService(repositories),
    budgets: createBudgetService(repositories),
    analytics: createAnalyticsService(repositories),
    settings: createSettingsService(repositories),
  };
}
