require('dotenv').config();
console.log("ENV DEBUG:", process.env.SHOP_NAME, process.env.SHOPIFY_ADMIN_TOKEN ? "TOKEN_LOADED" : "NO_TOKEN");


const axios = require('axios');

const SHOP_NAME = process.env.SHOP_NAME;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;


const API_VERSION = '2024-07';

if (!SHOP_NAME || !SHOPIFY_ADMIN_TOKEN) {
  console.error('Missing required environment variables SHOP_NAME and/or SHOPIFY_ADMIN_TOKEN.');
  console.error('Example: SHOP_NAME=my-shop SHOPIFY_ADMIN_TOKEN=shpat_xxx node seed-shopify.js');
  process.exit(1);
}

const api = axios.create({
  baseURL: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetries(requestFn, { maxRetries = 5, baseDelayMs = 1000 } = {}) {
  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const retryAfter = error?.response?.headers?.['retry-after'];
      const willRetry = (status >= 500 && status < 600) || status === 429;

      if (!willRetry || attempt === maxRetries) break;

      const backoffMs = retryAfter
        ? Number(retryAfter) * 1000
        : baseDelayMs * Math.pow(2, attempt);

      console.warn(`Request failed with status ${status}. Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await sleep(backoffMs);
      attempt += 1;
    }
  }
  throw lastError;
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomPrice(min = 5, max = 200) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function randomDateInLast30Days() {
  const now = new Date();
  const past = new Date();
  past.setDate(now.getDate() - 30);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// ----- Products -----
function generateDummyProduct(index) {
  const vendors = ['Acme Co', 'Globex', 'Umbrella', 'Wayne Enterprises', 'Soylent'];
  const types = ['T-Shirt', 'Mug', 'Sticker', 'Poster', 'Hoodie', 'Cap', 'Bag'];
  const adjectives = ['Classic', 'Premium', 'Eco', 'Limited', 'Vintage', 'Modern', 'Essential'];

  const title = `${randomFrom(adjectives)} ${randomFrom(types)} #${index + 1}`;
  const price = randomPrice();

  return {
    product: {
      title,
      body_html: `<p>${title} — automatically seeded product.</p>`,
      vendor: randomFrom(vendors),
      product_type: randomFrom(types),
      status: 'active',
      variants: [
        {
          price,
          sku: `SKU-${Date.now()}-${index}`,
          inventory_management: 'shopify',
        },
      ],
      tags: ['seed', 'dummy', 'automated'],
    },
  };
}

// ----- Customers -----
function generateDummyCustomer(index) {
  const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Avery', 'Morgan', 'Quinn', 'Charlie'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin'];

  const first = randomFrom(firstNames);
  const last = randomFrom(lastNames);
  const email = `seed+${first.toLowerCase()}.${last.toLowerCase()}.${Date.now()}_${index}@example.com`;

  return {
    customer: {
      first_name: first,
      last_name: last,
      email,
      verified_email: true,
      accepts_marketing: false,
      tags: 'seed,dummy,automated',
    },
  };
}

// ----- Orders -----
function generateDummyOrder(customer, products) {
  const numItems = Math.floor(Math.random() * 3) + 1;
  const chosenProducts = [];
  for (let i = 0; i < numItems; i++) {
    chosenProducts.push(randomFrom(products));
  }

  const line_items = chosenProducts.map((p, idx) => ({
    variant_id: p.variants[0].id,
    quantity: Math.floor(Math.random() * 3) + 1,
  }));

  const created_at = randomDateInLast30Days().toISOString();

  return {
    order: {
      email: customer.email,
      customer: { id: customer.id },
      line_items,
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      created_at,
      tags: 'seed,dummy,automated',
    },
  };
}

async function createProduct(index) {
  const payload = generateDummyProduct(index);
  const res = await withRetries(() => api.post('/products.json', payload));
  return res.data?.product;
}

async function createCustomer(index) {
  const payload = generateDummyCustomer(index);
  const res = await withRetries(() => api.post('/customers.json', payload));
  return res.data?.customer;
}

async function createOrder(customer, products, index) {
  const payload = generateDummyOrder(customer, products);
  const res = await withRetries(() => api.post('/orders.json', payload));
  return res.data?.order;
}

async function main() {
  const numProducts = 10;
  const numCustomers = 20;
  const numOrders = 50;

  console.log(`Seeding ${numProducts} products, ${numCustomers} customers, and ${numOrders} orders to shop ${SHOP_NAME}...`);

  const products = [];
  const customers = [];

  // Products
  for (let i = 0; i < numProducts; i++) {
    try {
      const product = await createProduct(i);
      products.push(product);
      console.log(`Created product ${i + 1}/${numProducts}: ${product?.title} (id: ${product?.id})`);
      await sleep(300);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error(`Failed to create product ${i + 1}: status=${status}`, data || err.message);
    }
  }

  // Customers
  for (let i = 0; i < numCustomers; i++) {
    try {
      const customer = await createCustomer(i);
      customers.push(customer);
      console.log(`Created customer ${i + 1}/${numCustomers}: ${customer?.first_name} ${customer?.last_name} (id: ${customer?.id})`);
      await sleep(300);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error(`Failed to create customer ${i + 1}: status=${status}`, data || err.message);
    }
  }

  // Orders
  for (let i = 0; i < numOrders; i++) {
    try {
      const customer = randomFrom(customers);
      const order = await createOrder(customer, products, i);
      console.log(`Created order ${i + 1}/${numOrders}: id=${order?.id}, customer=${customer?.email}`);
      await sleep(500); // slightly longer delay for orders
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error(`Failed to create order ${i + 1}: status=${status}`, data || err.message);
    }
  }

  console.log('Seeding complete.');
}

main().catch(err => {
  console.error('Unexpected error during seeding:', err?.response?.data || err);
  process.exit(1);
});
