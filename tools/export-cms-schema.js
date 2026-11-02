// Copies cms/schema.js into the Edge Function as JSON, so the hosted /admin and the
// Mac CMS use one set of forms. `--check` fails if the copy is out of date.
const fs = require("node:fs");
const path = require("node:path");
const schemas = require("../cms/schema");

const target = path.join(__dirname, "..", "supabase", "functions", "cms", "schema.json");
const json = `${JSON.stringify(schemas, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== json) {
    console.error("supabase/functions/cms/schema.json is out of date: run node tools/export-cms-schema.js and redeploy the cms function.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(target, json);
  console.log(`Wrote ${path.relative(process.cwd(), target)}`);
}
