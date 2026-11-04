import { existsSync, mkdirSync, statSync, rmSync, type PathLike } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const certsDir = join(projectRoot, "certs");

const certFile = join(certsDir, "selfsigned.crt");
const keyFile = join(certsDir, "selfsigned.key");
const domains = ["localhost", "127.0.0.1", "::1"];

// Флаг --reset-only очищает старые сертификаты перед генерацией
const args = process.argv.slice(2);
const resetIndex = args.indexOf("--reset");
if (resetIndex !== -1) {
  args.splice(resetIndex, 1);
  rmSync(certFile, { force: true });
  rmSync(keyFile, { force: true });
  console.log("🗑️  Старые сертификаты удалены.");
}

mkdirSync(certsDir, { recursive: true });

function isNonEmptyFile(filePath: PathLike): boolean {
  return existsSync(filePath) && statSync(filePath).size > 0;
}

function hasCommand(cmd: string): boolean {
  const result = spawnSync(cmd, ["--version"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

function run(cmd: string, cmdArgs: readonly string[], options = {}): void {
  const result = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    cwd: projectRoot,
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (isNonEmptyFile(certFile) && isNonEmptyFile(keyFile)) {
  console.log(`✅ SSL-сертификаты уже существуют в ${certsDir}`);
} else {
  console.log("🔐 Сертификаты не найдены. Начинаем генерацию...");

  if (hasCommand("mkcert")) {
    console.log("ℹ️  Обнаружен mkcert. Устанавливаем локальный Root CA...");
    run("mkcert", ["-install"]);

    console.log(`ℹ️  Генерируем сертификат для: ${domains.join(", ")}`);
    run("mkcert", ["-key-file", keyFile, "-cert-file", certFile, ...domains]);
    console.log("✅ Локально доверенные сертификаты созданы!");
  } else if (hasCommand("openssl")) {
    console.log("⚠️  mkcert не найден. Используем fallback на OpenSSL...");
    run("openssl", [
      "req",
      "-x509",
      "-nodes",
      "-days",
      "365",
      "-newkey",
      "rsa:2048",
      "-keyout",
      keyFile,
      "-out",
      certFile,
      "-subj",
      "/C=RU/ST=State/L=City/O=Dev/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ]);
    console.log("✅ Самоподписанный сертификат OpenSSL создан.");
  } else {
    console.error("❌ Ошибка: не найдены ни mkcert, ни openssl.");
    process.exit(1);
  }
}

console.log("🚀 Запускаем Docker Compose...");
run("docker", ["compose", "up", "-d", ...args]);
