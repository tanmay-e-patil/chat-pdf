import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const _userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .execute();

    const returnUrl = `${process.env.NEXT_BASE_URL}/`;
    if (_userSubscriptions[0] && _userSubscriptions[0].stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: _userSubscriptions[0].stripeCustomerId,
        return_url: returnUrl,
      });
      return NextResponse.json({ url: stripeSession.url }, { status: 200 });
    }
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: returnUrl,
      cancel_url: returnUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: user?.emailAddresses[0]?.emailAddress,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Chat-PDF Pro Subscription",
              description: "Unlimited PDF sessions",
            },
            unit_amount: 2000,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
      },
    });
    return NextResponse.json({ url: stripeSession.url }, { status: 200 });
  } catch (error) {
    console.error("Stripe error: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
