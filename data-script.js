const data = require("./assets/data.json");
const fs = require("fs");

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
}

const covers = fs.readdirSync("./assets/covers");

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
  const np = `./assets/covers/${name}.${ext.toLowerCase()}`;
  fs.renameSync(`./assets/covers/${c}`, np);
  names.push({
    name,
    np,
  });
}

names.sort((a, b) => a.name - b.name);
fs.writeFileSync(
  "./covers.gen.ts",
  `export const covers: Record<string, any> = {
  ${names.map((n) => `['cover_${n.name}']: require('${n.np}')`).join(",\r\n  ")}
}`
);

const table = "fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF";
const tr = {};
for (let i = 0; i < 58; i++) {
  tr[table[i]] = i;
}
const s = [11, 10, 3, 8, 4, 6];
const xor = 177451812;
const add = 8728348608;

function dec(x) {
  let r = 0;
  for (let i = 0; i < 6; i++) {
    r += tr[x[s[i]]] * Math.pow(58, i);
  }
  return (r - add) ^ xor;
}

function enc(x) {
  x = (x ^ xor) + add;
  let r = Array.from("BV1  4 1 7  ");
  for (let i = 0; i < 6; i++) {
    r[s[i]] = table[Math.floor(x / Math.pow(58, i)) % 58];
  }
  return r.join("");
}

const links = [];

for (let i = 0; i < data.length; i++) {
  data[i].cover = names[names.length - i - 1].name;
  data[i].bid = enc(data[i].aid);

  links.push(...data[i].hn_items.introduces);
}

console.log(links.join("\r\n"));

fs.writeFileSync("./assets/data.json", JSON.stringify(data, null, 2));
