require('dotenv').config();

console.log("SHOP_NAME:", process.env.SHOP_NAME);
console.log("TOKEN:", process.env.SHOPIFY_ADMIN_TOKEN ? "LOADED" : "NOT LOADED");
