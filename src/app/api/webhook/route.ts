import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { env } from "@/lib/env/server";
import { stripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error(error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    console.log(`Payment successful for session ${session.id}`);
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription! as string,
    );
    if (!session?.metadata?.userId) {
      console.error("Missing userId in metadata");
      return new NextResponse("Missing userId in metadata", { status: 400 });
    }
    await db.insert(subscriptions).values({
      userId: session.metadata.userId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }
  if (event.type === "invoice.payment_succeeded") {
    console.log(`Invoice payment succeeded for session ${session.id}`);
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription! as string,
    );
    if (!session?.metadata?.userId) {
      console.error("Missing userId in metadata");
      return new NextResponse("Missing userId in metadata", { status: 400 });
    }
    await db
      .update(subscriptions)
      .set({
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000,
        ),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .execute();
  }
  return new NextResponse(null, { status: 200 });
}
