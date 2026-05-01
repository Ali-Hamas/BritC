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
  createCustomerPortal,
  constructEvent,
  WEBHOOK_SECRET,
  PRICE_ID,
};
