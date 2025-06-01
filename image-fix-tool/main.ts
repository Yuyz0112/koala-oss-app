import { flow } from "./flow.ts";
import { SharedStorage } from "./nodes.ts";
import { listNotChecked } from "./utils/db.ts";

async function main() {
  const notChecked = await listNotChecked();

  if (notChecked.length === 0) {
    console.log("No images to check.");
    return;
  }

  for (const news of notChecked.slice(0)) {
    const shared: SharedStorage = {
      news,
    };

    await flow.run(shared);
  }
}

await main();
