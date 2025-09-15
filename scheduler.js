import cron from "node-cron";
import { exec } from "child_process";

console.log("Scheduler service started ");

cron.schedule("0 */6 * * *", () => {
  console.log("Running scheduled Shopify sync...");
  exec("node sync-shopify.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`Sync failed: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Sync stderr: ${stderr}`);
      return;
    }
    console.log(` Sync success: ${stdout}`);
  });
});
