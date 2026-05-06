const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://britsyncai.com';

async function createCheckoutSession(userId, email, name) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${FRONTEND_URL}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/`,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  });
  return { url: session.url, sessionId: session.id };
}

async function createSubscriptionIntent(userId, email) {
  if (!PRICE_ID) {
    throw new Error('STRIPE_PRICE_ID is not configured in backend .env');
  }

  let customer;
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length) {
    customer = existing.data[0];
  } else {
    customer = await stripe.customers.create({ email, metadata: { userId } });
  }

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: PRICE_ID }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: [
      'latest_invoice.payment_intent',
      'latest_invoice.confirmation_secret',
      'pending_setup_intent',
    ],
    metadata: { userId },
  });

  const invoice = subscription.latest_invoice;
  let clientSecret = null;

  if (invoice && invoice.payment_intent && invoice.payment_intent.client_secret) {
    clientSecret = invoice.payment_intent.client_secret;
  } else if (invoice && invoice.confirmation_secret && invoice.confirmation_secret.client_secret) {
    clientSecret = invoice.confirmation_secret.client_secret;
  } else if (subscription.pending_setup_intent && subscription.pending_setup_intent.client_secret) {
    clientSecret = subscription.pending_setup_intent.client_secret;
  }

  if (!clientSecret && invoice && invoice.id) {
    try {
      const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
        expand: ['payment_intent', 'confirmation_secret'],
      });
      if (fullInvoice.payment_intent && fullInvoice.payment_intent.client_secret) {
        clientSecret = fullInvoice.payment_intent.client_secret;
      } else if (fullInvoice.confirmation_secret && fullInvoice.confirmation_secret.client_secret) {
        clientSecret = fullInvoice.confirmation_secret.client_secret;
      }
    } catch (e) {
      console.error('[stripe] Invoice retrieve fallback failed:', e.message);
    }
  }

  if (!clientSecret) {
    console.error('[stripe] No client secret. Subscription:', JSON.stringify({
      id: subscription.id,
      status: subscription.status,
      hasInvoice: !!invoice,
      invoiceStatus: invoice?.status,
      hasPI: !!invoice?.payment_intent,
      hasConfSecret: !!invoice?.confirmation_secret,
      hasPendingSI: !!subscription.pending_setup_intent,
    }));
    throw new Error('Failed to create PaymentIntent for subscription');
  }

  return {
    subscriptionId: subscription.id,
    clientSecret,
    customerId: customer.id,
  };
}

async function createCustomerPortal(customerId) {
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: FRONTEND_URL,
  });
  return portal.url;
}

function constructEvent(payload, signature) {
  return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
}

module.exports = {
  stripe,
  createCheckoutSession,
  createSubscriptionIntent,
  createCustomerPortal,
  constructEvent,
  WEBHOOK_SECRET,
  PRICE_ID,
};
