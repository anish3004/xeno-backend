import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { PrismaClient } from "./generated/prisma/index.js";

dotenv.config();
const prisma = new PrismaClient();
const app = express();
app.use(bodyParser.json());

const PORT = 4000;
const SHOP_NAME = process.env.SHOP_NAME;


app.post(/^\/webhook(?:\/.*)?$/, (req, res, next) => {
  console.log(" Received webhook:", req.originalUrl);
  console.log("Payload:", JSON.stringify(req.body, null, 2));
  next(); 
});

async function saveEvent(eventType, payload) {
  try {
    await prisma.customEvent.create({
      data: {
        type: eventType,
        payload: payload,
        storeId: SHOP_NAME,
      },
    });
    console.log(`${eventType} event saved`);
  } catch (err) {
    console.error(" Error saving event:", err.message);
  }
}

app.post("/webhook/cart", async (req, res) => {
  await saveEvent("cart_created", req.body);
  res.status(200).send("ok");
});

app.post("/webhook/checkout", async (req, res) => {
  await saveEvent("checkout_created", req.body);
  res.status(200).send("ok");
});

// webhook-server.js
app.post("/webhook/cart/update", async (req, res) => {
  try {
    await saveEvent("cart_updated", req.body);
    console.log("Cart updated event saved");
    res.status(200).send("ok");
  } catch (err) {
    console.error("Error saving cart update event:", err);
    res.status(500).send("error");
  }
});


app.post("/webhook/checkout/complete", async (req, res) => {
  try {
    await saveEvent("checkout_completed", req.body);
    console.log("Checkout completed event saved");
    res.status(200).send("ok");
  } catch (err) {
    console.error("Error saving checkout completed event:", err);
    res.status(500).send("error");
  }
});


app.listen(PORT, () => {
  console.log(`Webhook server running at http://localhost:${PORT}/webhook`);
});
