import type { Customer } from "@prisma/client";

export type CustomerRow = Customer & {
  totalSpent: number;
  debt: number;
  ordersCount: number;
  overdue: boolean;
  dueSoon: boolean;
};
