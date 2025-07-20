import { Stripe } from "stripe";
import { env } from "./env/server";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});
