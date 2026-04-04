/** @param {import("stripe").default} stripe */
export async function resolveStripeCustomerId(stripe, userId, email) {
  for (const status of ["active", "trialing"]) {
    const found = await stripe.subscriptions.search({
      query: `metadata['userId']:'${userId}' AND status:'${status}'`,
      limit: 1,
    });
    const sub = found.data[0];
    if (sub) {
      return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    }
  }

  const customers = await stripe.customers.list({ email, limit: 20 });
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      limit: 10,
    });
    const open = subs.data.find((s) => s.status === "active" || s.status === "trialing");
    if (open) return c.id;
  }

  return null;
}
