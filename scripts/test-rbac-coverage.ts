import fs from "fs";
import path from "path";

const API_DIR = path.join(process.cwd(), "src", "app", "api");
const WHITELIST = [
  path.join("src", "app", "api", "health", "route.ts"),
  path.join("src", "app", "api", "health", "persistence", "route.ts"),
  path.join("src", "app", "api", "auth", "login", "route.ts"),
];

const HTTP_VERBS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

function getAllRouteFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllRouteFiles(filePath));
    } else if (file === "route.ts") {
      results.push(filePath);
    }
  }
  return results;
}

function normalizePath(p: string): string {
  return p.split(path.sep).join("/");
}

function auditRouteFile(filePath: string) {
  const relativePath = path.relative(process.cwd(), filePath);
  const normalizedRelative = normalizePath(relativePath);
  
  const isWhitelisted = WHITELIST.some((w) => normalizePath(w) === normalizedRelative);
  
  const content = fs.readFileSync(filePath, "utf-8");

  const handlers: { verb: string; isProtected: boolean }[] = [];

  for (const verb of HTTP_VERBS) {
    const exportRegex = new RegExp(`export\\s+(const|async\\s+function)\\s+${verb}\\b`);
    if (exportRegex.test(content)) {
      if (isWhitelisted) {
        handlers.push({ verb, isProtected: true });
        continue;
      }
      const wrapperRegex = new RegExp(`export\\s+const\\s+${verb}\\s*=\\s*withAuthAndPermission\\(`);
      const isProtected = wrapperRegex.test(content);
      handlers.push({ verb, isProtected });
    }
  }

  return {
    relativePath: normalizedRelative,
    isWhitelisted,
    handlers,
  };
}

function main() {
  console.log("=== Auditing RBAC Coverage for API Routes ===\n");
  const files = getAllRouteFiles(API_DIR);
  
  let totalHandlers = 0;
  let protectedHandlers = 0;
  let unprotectedHandlers = 0;
  let whitelistedCount = 0;

  const violations: { file: string; verb: string }[] = [];

  for (const file of files) {
    const res = auditRouteFile(file);
    if (res.isWhitelisted) {
      whitelistedCount += res.handlers.length;
      console.log(`[WHITELISTED] ${res.relativePath} (${res.handlers.map(h => h.verb).join(", ")})`);
      continue;
    }

    for (const h of res.handlers) {
      totalHandlers++;
      if (h.isProtected) {
        protectedHandlers++;
        console.log(`  ✓ ${res.relativePath} [${h.verb}] -> PROTECTED (withAuthAndPermission)`);
      } else {
        unprotectedHandlers++;
        console.log(`  ✗ ${res.relativePath} [${h.verb}] -> UNPROTECTED!`);
        violations.push({ file: res.relativePath, verb: h.verb });
      }
    }
  }

  console.log("\n================ SUMMARY ================");
  console.log(`Total API Route Files: ${files.length}`);
  console.log(`Whitelisted Handlers: ${whitelistedCount}`);
  console.log(`Target Handlers: ${totalHandlers}`);
  console.log(`Protected Handlers: ${protectedHandlers}`);
  console.log(`Unprotected Handlers: ${unprotectedHandlers}`);

  if (violations.length > 0) {
    console.error("\n❌ ERROR: Unprotected API handlers found:");
    violations.forEach((v) => console.error(`   - ${v.file} [${v.verb}]`));
    process.exit(1);
  } else {
    console.log("\n✅ SUCCESS: 100% RBAC coverage achieved across all endpoints!");
    process.exit(0);
  }
}

main();
