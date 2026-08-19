import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Stripe from "stripe";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { requireUser } from "../lib/require-user.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/billing/status
  app.get("/billing/status", async (req: FastifyRequest) => {
    const me = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, me.sub))
      .limit(1);
    const sub = rows[0];
    return {
      enabled: Boolean(stripe),
      status: sub?.status ?? "inactive",
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
      exportPriceCents: Number(process.env.EXPORT_PRICE_CENTS ?? 100),
      currency: process.env.PAYMENT_CURRENCY ?? "usd",
    };
  });

  // POST /api/billing/checkout
  app.post("/billing/checkout", async (req: FastifyRequest, reply: FastifyReply) => {
    const me = await requireUser(req);
    if (!stripe) {
      return reply.code(503).send({ error: "Stripe not configured" });
    }

    let sub = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, me.sub))
      .limit(1)
      .then((rows) => rows[0]);

    let customerId = sub?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: me.email });
      customerId = customer.id;
      sub = (
        await db
          .insert(schema.subscriptions)
          .values({ userId: me.sub, stripeCustomerId: customerId })
          .returning()
      )[0];
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return reply.code(503).send({ error: "No Stripe price configured" });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_BASE_URL}/app/account?billing=success`,
      cancel_url: `${process.env.APP_BASE_URL}/app/account?billing=cancel`,
    });

    return { url: session.url };
  });

  // POST /api/billing/portal
  app.post("/billing/portal", async (req: FastifyRequest, reply: FastifyReply) => {
    const me = await requireUser(req);
    if (!stripe) {
      return reply.code(503).send({ error: "Stripe not configured" });
    }
    const sub = await db
      .select({ stripeCustomerId: schema.subscriptions.stripeCustomerId })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, me.sub))
      .limit(1)
      .then((rows) => rows[0]);
    if (!sub?.stripeCustomerId) {
      return reply.code(404).send({ error: "No subscription found" });
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.APP_BASE_URL}/app/account`,
    });
    return { url: portal.url };
  });

  // POST /api/billing/webhook
  app.post(
    "/billing/webhook",
    {
      // Stripe needs the raw request body to verify signatures.
      preParsing: async (_req, _reply, payload) => {
        const chunks: Buffer[] = [];
        for await (const chunk of payload) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks);
        (_req as FastifyRequest & { rawBody: string }).rawBody = raw.toString("utf8");
        return raw;
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!stripe) return reply.code(503).send({ error: "Stripe not configured" });
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) return reply.code(503).send({ error: "Webhook secret not configured" });

      const sig = req.headers["stripe-signature"];
      if (typeof sig !== "string") {
        return reply.code(400).send({ error: "Missing stripe-signature" });
      }

      const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody;
      if (!rawBody) {
        return reply.code(400).send({ error: "Missing raw body" });
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, secret);
      } catch (err) {
        app.log.warn({ err }, "stripe webhook verify failed");
        return reply.code(400).send({ error: "Invalid signature" });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.userId;
        if (!userId) {
          return reply.code(200).send({ received: true, ignored: true });
        }
        const customerId = session.customer as string;
        const subId = session.subscription as string;
        await db
          .insert(schema.subscriptions)
          .values({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            status: "active",
            currentPeriodEnd: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
          })
          .onConflictDoUpdate({
            target: schema.subscriptions.userId,
            set: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId,
              status: "active",
              currentPeriodEnd: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
              updatedAt: new Date(),
            },
          });
      }

      if (event.type === "invoice.paid") {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        const userId = invoice.metadata?.userId ?? invoice.customer_email;
        if (!userId) {
          return reply.code(200).send({ received: true, ignored: true });
        }
        const sub = await stripe.subscriptions.retrieve(subId);
        await db
          .update(schema.subscriptions)
          .set({
            status: sub.status === "active" ? "active" : sub.status,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : undefined,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, userId));
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) {
          return reply.code(200).send({ received: true, ignored: true });
        }
        await db
          .update(schema.subscriptions)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(schema.subscriptions.userId, userId));
      }

      return { received: true };
    },
  );

  // POST /api/billing/pay-export — dev fallback / one-off export unlock
  app.post("/billing/pay-export", async (req: FastifyRequest, reply: FastifyReply) => {
    const me = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.usage)
      .where(eq(schema.usage.userId, me.sub))
      .limit(1);
    const u = rows[0];
    if (!u) {
      return reply.code(404).send({ error: "Usage profile not found" });
    }
    if (u.paid) return { ok: true, alreadyPaid: true };
    if (u.freeExportsUsed < FREE_EXPORTS_TOTAL) {
      await db
        .update(schema.usage)
        .set({ freeExportsUsed: u.freeExportsUsed + 1 })
        .where(eq(schema.usage.id, u.id));
      return { ok: true, freeExport: true, remaining: FREE_EXPORTS_TOTAL - u.freeExportsUsed - 1 };
    }
    await db.update(schema.usage).set({ paid: true }).where(eq(schema.usage.id, u.id));
    return { ok: true, paid: true, message: "Payment received (stub). Unlimited exports unlocked." };
  });
}

const FREE_EXPORTS_TOTAL = 4;
