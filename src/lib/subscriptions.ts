import { auth } from "@clerk/nextjs/server";
import { subscriptions } from "./db/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const checkSubscription = async () => {
  const { userId } = await auth();
  if (!userId) {
    return false;
  }
  const _userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .execute();
  if (!_userSubscriptions[0]) {
    return false;
  }
  const userSubscription = _userSubscriptions[0];
  const isValid =
    userSubscription.stripePriceId &&
    userSubscription.stripeCurrentPeriodEnd!.getTime()! + DAY_IN_MS >
      Date.now();
  return !!isValid;
};
