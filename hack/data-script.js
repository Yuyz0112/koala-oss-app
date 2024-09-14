const data = require("../assets/data.json");
const fs = require("fs");
const path = require("path");

for (const item of data) {
  const {
    hn_items: { times, introduces, links },
  } = item;

  if (times.length !== introduces.length) {
    console.log(introduces);
    throw new Error(
      `times.length(${times.length}) !== introduces.length(${introduces.length})`
    );
  }

  if (links.length !== introduces.length) {
    console.log(introduces);
    throw new Error(
      `links.length(${links.length}) !== introduces.length(${introduces.length})`
    );
  }

  for (let i = 0; i < links.length; i++) {
    if (!links[i]) {
      console.log(`${introduces[i]} does not have link`);
    }
  }
}

const covers = fs.readdirSync(path.resolve(__dirname, "../assets/covers"));

const names = [];
for (const c of covers) {
  const frags = c.split(".");
  const ext = frags[frags.length - 1];
  const name = parseFloat(
    c
      .trim()
      .replace(/hacker news/i, "")
      .replace("封面", "")
      .replace("fengmian", "")
      .replace(".png", "")
      .replace(".PNG", "")
      .replace(".jpg", "")
      .replace("a", ".1")
      .trim()
  );
  const np = `../assets/covers/${name}.${ext.toLowerCase()}`;
  fs.renameSync(
    path.resolve(__dirname, `../assets/covers/${c}`),
    path.resolve(__dirname, np)
  );
  names.push({
    name,
    np,
  });
}

names.sort((a, b) => a.name - b.name);
fs.writeFileSync(
  path.resolve(__dirname, "../src/covers.gen.ts"),
  `export const covers: Record<string, any> = {
  ${names.map((n) => `['cover_${n.name}']: require('${n.np}')`).join(",\r\n  ")}
}`
);

const XOR_CODE = 23442827791579n;
const MASK_CODE = 2251799813685247n;
const MAX_AID = 1n << 51n;
const BASE = 58n;

const table = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf';

function av2bv(aid) {
  const bytes = ['B', 'V', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0'];
  let bvIndex = bytes.length - 1;
  let tmp = (MAX_AID | BigInt(aid)) ^ XOR_CODE;
  while (tmp > 0) {
    bytes[bvIndex] = table[Number(tmp % BigInt(BASE))];
    tmp = tmp / BASE;
    bvIndex -= 1;
  }
  [bytes[3], bytes[9]] = [bytes[9], bytes[3]];
  [bytes[4], bytes[7]] = [bytes[7], bytes[4]];
  return bytes.join('');
}


for (let i = 0; i < data.length; i++) {
  data[i].cover = names[names.length - i - 1].name;
  if (data[i].aid) {
    data[i].bid = av2bv(data[i].aid);
  }
}

fs.writeFileSync(
  path.resolve(__dirname, "../assets/data.json"),
  JSON.stringify(data, null, 2)
);
