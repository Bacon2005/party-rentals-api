import "server-only";
import Stripe from "stripe";
import { z } from "zod";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_test_/.test(key))
    throw new Error("A Stripe test key is required.");
  return new Stripe(key);
}

export function getIdentityResultsStripe() {
  const key =
    process.env.STRIPE_IDENTITY_RESTRICTED_KEY ?? process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("rk_test_"))
    throw new Error(
      "A restricted Stripe test key is required for DOB results.",
    );
  return new Stripe(key);
}

export function identityReturnUrl() {
  const site = z.url().parse(process.env.NEXT_PUBLIC_SITE_URL);
  const url = new URL("/verify-identity", site);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  ) {
    throw new Error("Use HTTPS or localhost for the site URL.");
  }
  return url.toString();
}
