import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const viteServer = read("server/vite.ts");
const dockerfile = read("Dockerfile");
const devCompose = read("docker-compose.yml");
const prodCompose = read("docker-compose.prod.yml");
const tsconfig = JSON.parse(read("tsconfig.json"));
const pkg = JSON.parse(read("package.json"));

assert(!/^import .* from ["']vite["'];/m.test(viteServer), "server/vite.ts must not statically import Vite");
assert(!viteServer.includes("nanoid"), "nanoid must not be used for development cache busting");
assert(viteServer.includes('import("vite")'), "Vite must be dynamically imported inside setupVite");
assert(viteServer.includes('import(viteConfigUrl)'), "vite.config must be loaded through a runtime URL so esbuild cannot bundle its dev dependencies");
assert(dockerfile.includes('CMD ["node", "dist/index.js"]'), "runtime must launch Node directly");
assert(dockerfile.includes("npm run check && npm run security:check && npm run build"), "Docker release stage must run all validation gates");
assert(devCompose.includes("env_file:"), "development Compose must load .env");
assert(devCompose.includes("- .:/app"), "development Compose must bind mount the source tree");
assert(devCompose.includes('$${DATABASE_BOOTSTRAP:-false}'), "development bootstrap must be controlled by container environment");
const devAppBlock = devCompose.split(/\n  app:\n/)[1]?.split(/\nnetworks:\n/)[0] ?? "";
const devDatabaseBlock = devCompose.split(/\n  database:\n/)[1]?.split(/\n  app:\n/)[0] ?? "";
assert(!devAppBlock.includes("cap_drop:"), "development app must not drop all capabilities on a bind mount");
assert(!devCompose.includes('command: ["sh", "-c", "npm run db:bootstrap'), "development bootstrap must not run unconditionally");
assert(devCompose.includes("internal: true"), "PostgreSQL backend network must be internal");
assert(devDatabaseBlock.includes("- devhost"), "development PostgreSQL must join the devhost bridge for Codespaces host access");
assert(devCompose.includes("\n  devhost:\n    driver: bridge"), "development devhost bridge network is missing");
assert(devCompose.includes('"127.0.0.1:${POSTGRES_HOST_PORT:-5432}:5432"'), "development PostgreSQL must bind only to loopback for host/Codespaces access");
const prodDatabaseBlock = prodCompose.split(/\n  database:\n/)[1]?.split(/\n  migrate:\n/)[0] ?? "";
assert(!prodDatabaseBlock.includes("ports:"), "production PostgreSQL must not publish a host port");
assert(devCompose.includes("/healthz"), "app healthcheck must use /healthz");
assert(prodCompose.includes('restart: unless-stopped'), "production services must have restart policy");
assert(prodCompose.includes('max-size: "10m"'), "production logs must be rotated");
assert(prodCompose.includes('cap_drop:'), "production app must drop Linux capabilities");
assert(prodCompose.includes('memory: 512M'), "production resource limit must be present");
assert(tsconfig.include?.includes("scripts/**/*"), "security scripts must be part of TypeScript checking");
assert(pkg.scripts?.["db:migrate"], "db:migrate command must exist");
assert(prodCompose.includes("npm run db:migrate"), "production migration service must use the built release runner");
assert(!prodCompose.includes("npm run db:migrate:dev"), "production migration service must not use the TypeScript development runner");
assert(pkg.scripts?.["audit:prod"] === "npm audit --omit=dev", "production audit command must exist");
assert(fs.existsSync("ops/backup/backup-postgres.sh"), "database backup script is missing");
assert(fs.existsSync("ops/backup/restore-postgres.sh"), "database restore script is missing");
assert(fs.existsSync("ops/backup/backup-loop.sh"), "scheduled backup loop is missing");
assert(prodCompose.includes("backup-scheduler:"), "scheduled backup service is missing");

console.log("Infrastructure regression checks passed.");
