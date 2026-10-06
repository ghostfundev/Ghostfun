import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Add an R2 incremental cache here later if you start using ISR.
  // https://opennext.js.org/cloudflare/caching
});
