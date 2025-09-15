// sync-shopify.js
require('dotenv').config();
const { PrismaClient } = require('./generated/prisma');
const axios = require('axios');

const prisma = new PrismaClient();

const SHOP_NAME = process.env.SHOP_NAME;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = '2024-07';

const api = axios.create({
  baseURL: `https://${SHOP_NAME}.myshopify.com/admin/api/${API_VERSION}`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

async function syncProducts() {
  console.log('Syncing products...');
  const products = (await api.get('/products.json?limit=50')).data.products;

  for (const p of products) {
    const price = parseFloat(p.variants?.[0]?.price || 0);

    await prisma.product.upsert({
      where: { shopifyId: p.id.toString() },
      update: {
        title: p.title,
        vendor: p.vendor,
        price: price,
        storeId: SHOP_NAME,
      },
      create: {
        shopifyId: p.id.toString(),
        title: p.title,
        vendor: p.vendor,
        price: price,
        storeId: SHOP_NAME,
      },
    });
  }
  console.log(`✔ Synced ${products.length} products`);
}

async function syncCustomers() {
  console.log('Syncing customers...');
  const customers = (await api.get('/customers.json?limit=50')).data.customers;

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { shopifyId: c.id.toString() },
      update: {
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        storeId: SHOP_NAME,
      },
      create: {
        shopifyId: c.id.toString(),
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        storeId: SHOP_NAME,
      },
    });
  }
  console.log(`✔ Synced ${customers.length} customers`);
}

async function syncOrders() {
  console.log('Syncing orders...');
  const orders = (await api.get('/orders.json?limit=50&status=any')).data.orders;

  for (const o of orders) {
    let customerRecord = null;

    if (o.customer?.id) {
      customerRecord = await prisma.customer.findUnique({
        where: { shopifyId: o.customer.id.toString() },
      });

      if (!customerRecord) {
        customerRecord = await prisma.customer.create({
          data: {
            shopifyId: o.customer.id.toString(),
            firstName: o.customer.first_name || '',
            lastName: o.customer.last_name || '',
            email: o.customer.email || `guest-${o.id}@example.com`,
            storeId: SHOP_NAME,
          },
        });
      }
    }

    const orderRecord = await prisma.order.upsert({
      where: { shopifyId: o.id.toString() },
      update: {
        totalPrice: parseFloat(o.total_price || 0),
        createdAt: new Date(o.created_at),
        customerId: customerRecord ? customerRecord.id : null,
        storeId: SHOP_NAME,
      },
      create: {
        shopifyId: o.id.toString(),
        totalPrice: parseFloat(o.total_price || 0),
        createdAt: new Date(o.created_at),
        customerId: customerRecord ? customerRecord.id : null,
        storeId: SHOP_NAME,
      },
    });

    if (o.line_items?.length > 0) {
      for (const li of o.line_items) {
        const productRecord = await prisma.product.findUnique({
          where: { shopifyId: li.product_id?.toString() },
        });

        if (productRecord) {
          await prisma.orderItem.upsert({
            where: { id: `${orderRecord.id}-${productRecord.id}` },
            update: {
              quantity: li.quantity,
              price: parseFloat(li.price || 0),
              storeId: SHOP_NAME,
            },
            create: {
              id: `${orderRecord.id}-${productRecord.id}`,
              quantity: li.quantity,
              price: parseFloat(li.price || 0),
              orderId: orderRecord.id,
              productId: productRecord.id,
              storeId: SHOP_NAME,
            },
          });
        }
      }
    }
  }

  console.log(`✔ Synced ${orders.length} orders`);
}

async function main() {
  try {
    await syncProducts();
    await syncCustomers();
    await syncOrders();
    console.log('Sync complete');
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
