"use client";
import React from "react";
import { Button } from "./ui/button";

type Props = {
  isPro: boolean;
};

const SubscriptionButton = ({ isPro }: Props) => {
  const [loading, setLoading] = React.useState(false);
  const handleSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stripe");
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button disabled={loading} onClick={handleSubscription}>
      {isPro ? "Manage Subscriptions" : "Subscribe"}
    </Button>
  );
};

export default SubscriptionButton;
