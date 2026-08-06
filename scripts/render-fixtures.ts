/**
 * Render all fixture models to BPMN XML + PNG previews.
 *
 * Usage:
 *   npm run preview
 *
 * Output:
 *   previews/YYYY-MM-DD_HH-mm-ss/<fixture>.bpmn
 *   previews/YYYY-MM-DD_HH-mm-ss/<fixture>.png
 *
 * PNG framing (white background + padding) is applied after render —
 * conversion / layout logic is untouched.
 */
import { mkdir, writeFile, readFile, stat, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";
import { convertAll } from "bpmn-to-image";
import puppeteer from "puppeteer";
import { convert, type ProcessModel } from "../src/index";
import * as fixtureExports from "../fixtures/models";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEWS_ROOT = path.join(ROOT, "previews");

/** White margin around the diagram in the final PNG (CSS px). */
const FRAME_PADDING_PX = 48;
const FRAME_BORDER_PX = 2;

const SYSTEM_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

type FixtureEntry = { name: string; model: ProcessModel };

const ansi = {
  title: (s: string) => styleText(["bold", "cyan"], s),
  ok: (s: string) => styleText(["bold", "green"], s),
  fail: (s: string) => styleText(["bold", "red"], s),
  dim: (s: string) => styleText("dim", s),
  step: (s: string) => styleText("yellow", s),
  name: (s: string) => styleText(["bold", "magenta"], s),
  path: (s: string) => styleText("blue", s),
  bar: (s: string) => styleText("cyan", s),
};

function isProcessModel(value: unknown): value is ProcessModel {
  if (!value || typeof value !== "object") return false;
  const m = value as ProcessModel;
  if (typeof m.id !== "string") return false;
  if (Array.isArray(m.processes) && m.processes.length > 0) return true;
  if (Array.isArray(m.nodes) && m.nodes.length > 0) return true;
  return false;
}

function collectFixtures(): FixtureEntry[] {
  return Object.entries(fixtureExports)
    .filter((entry): entry is [string, ProcessModel] => isProcessModel(entry[1]))
    .map(([name, model]) => ({ name, model }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function stampFolderName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
      "-",
    ) +
    "_" +
    [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(
      "-",
    )
  );
}

function line(char = "─", width = 56): string {
  return char.repeat(width);
}

function progressBar(done: number, total: number, width = 28): string {
  const filled = Math.round((done / total) * width);
  const empty = width - filled;
  const pct = Math.round((done / total) * 100);
  return (
    ansi.bar("█".repeat(filled)) +
    ansi.dim("░".repeat(empty)) +
    ` ${pct}%`
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function fileSize(filePath: string): Promise<string> {
  try {
    const s = await stat(filePath);
    return formatBytes(s.size);
  } catch {
    return "?";
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a Chrome binary for Puppeteer / bpmn-to-image.
 * Prefers env → bundled Chrome → system Chrome → auto-install.
 */
async function ensureChrome(): Promise<string> {
  const bundled = (() => {
    try {
      return puppeteer.executablePath();
    } catch {
      return null;
    }
  })();

  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    bundled,
    ...SYSTEM_CHROME_CANDIDATES,
  ].filter((p): p is string => !!p);

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }

  console.log(
    `  ${ansi.step("Chrome missing")} — installing Puppeteer browser…`,
  );
  const result = spawnSync(
    "npx",
    ["puppeteer", "browsers", "install", "chrome"],
    { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    throw new Error(
      "Chrome for Puppeteer is not installed. Run: npm run preview:setup",
    );
  }

  const after = puppeteer.executablePath();
  if (!(await pathExists(after))) {
    throw new Error(
      "Chrome install finished but binary still missing. Run: npm run preview:setup",
    );
  }
  return after;
}

/** Silence bpmn-to-image's own "writing …" logs during our progress UI. */
async function withQuietConsole<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.log;
  console.log = (...args: unknown[]) => {
    const text = String(args[0] ?? "");
    if (text.startsWith("writing ")) return;
    original.apply(console, args as Parameters<typeof console.log>);
  };
  try {
    return await fn();
  } finally {
    console.log = original;
  }
}

/**
 * Wrap an already-rendered diagram PNG in a white card with padding
 * and a thin black border. Does not alter BPMN content.
 */
async function framePngOnWhiteCard(pngPath: string): Promise<void> {
  const raw = await readFile(pngPath);
  const dataUrl = `data:image/png;base64,${raw.toString("base64")}`;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    body {
      display: inline-block;
    }
    .card {
      display: inline-block;
      background: #ffffff;
      padding: ${FRAME_PADDING_PX}px;
      line-height: 0;
    }
    .frame {
      display: inline-block;
      border: ${FRAME_BORDER_PX}px solid #000000;
      background: #ffffff;
      line-height: 0;
    }
    img {
      display: block;
      max-width: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="frame">
      <img id="diagram" src="${dataUrl}" alt="" />
    </div>
  </div>
</body>
</html>`,
      { waitUntil: "load" },
    );

    await page.waitForSelector("#diagram");
    await page.evaluate(async () => {
      const img = document.getElementById("diagram") as HTMLImageElement;
      if (!img.complete) {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("diagram image failed to load"));
        });
      }
    });

    const card = await page.$(".card");
    if (!card) throw new Error("frame card not found");
    await card.screenshot({ path: pngPath, type: "png", omitBackground: false });
  } finally {
    await browser.close();
  }
}

async function renderOne(
  entry: FixtureEntry,
  outDir: string,
  index: number,
  total: number,
): Promise<{ bpmn: string; png: string }> {
  const label = `[${index + 1}/${total}]`;
  console.log();
  console.log(
    `  ${ansi.step("▶")} ${ansi.dim(label)} ${ansi.name(entry.name)}`,
  );

  console.log(`    ${ansi.dim("├─")} ${ansi.step("JSON → BPMN")} …`);
  const xml = await convert(entry.model);
  const blob = Buffer.from(xml, "utf8");
  console.log(
    `    ${ansi.dim("├─")} ${ansi.ok("✓")} XML blob ${ansi.dim(`(${formatBytes(blob.byteLength)})`)}`,
  );

  const bpmnPath = path.join(outDir, `${entry.name}.bpmn`);
  const pngPath = path.join(outDir, `${entry.name}.png`);

  await writeFile(bpmnPath, blob);
  console.log(
    `    ${ansi.dim("├─")} ${ansi.ok("✓")} saved ${ansi.path(path.basename(bpmnPath))}`,
  );

  console.log(`    ${ansi.dim("├─")} ${ansi.step("BPMN → PNG")} …`);
  await withQuietConsole(() =>
    convertAll([{ input: bpmnPath, outputs: [pngPath] }], {
      footer: false,
      title: false,
      deviceScaleFactor: 2,
    }),
  );
  console.log(
    `    ${ansi.dim("├─")} ${ansi.ok("✓")} rendered ${ansi.path(path.basename(pngPath))}`,
  );

  console.log(
    `    ${ansi.dim("└─")} ${ansi.step("white frame + padding")} …`,
  );
  await framePngOnWhiteCard(pngPath);

  const pngSize = await fileSize(pngPath);
  console.log(
    `      ${ansi.ok("✓")} saved ${ansi.path(path.basename(pngPath))} ${ansi.dim(`(${pngSize})`)}`,
  );

  return { bpmn: bpmnPath, png: pngPath };
}

async function main() {
  const chromePath = await ensureChrome();
  process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;

  const fixtures = collectFixtures();
  const stamp = stampFolderName();
  const outDir = path.join(PREVIEWS_ROOT, stamp);

  console.log();
  console.log(ansi.title(`  ╔${line("═")}╗`));
  console.log(
    ansi.title(`  ║  Fixture → BPMN → PNG preview renderer`.padEnd(57) + `║`),
  );
  console.log(ansi.title(`  ╚${line("═")}╝`));
  console.log();
  console.log(`  ${ansi.dim("fixtures:")} ${ansi.ok(String(fixtures.length))}`);
  console.log(
    `  ${ansi.dim("output:  ")} ${ansi.path(path.relative(ROOT, outDir))}`,
  );
  console.log(
    `  ${ansi.dim("frame:   ")} white + ${FRAME_PADDING_PX}px pad + ${FRAME_BORDER_PX}px border`,
  );
  console.log(`  ${ansi.dim("chrome:  ")} ${ansi.path(chromePath)}`);
  console.log(`  ${ansi.dim(line())}`);

  if (fixtures.length === 0) {
    console.log(ansi.fail("  No ProcessModel fixtures found."));
    process.exitCode = 1;
    return;
  }

  await mkdir(outDir, { recursive: true });

  const started = Date.now();
  const ok: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let i = 0; i < fixtures.length; i++) {
    const entry = fixtures[i]!;
    try {
      await renderOne(entry, outDir, i, fixtures.length);
      ok.push(entry.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ name: entry.name, error: message });
      console.log(`    ${ansi.fail("✗")} ${ansi.fail(message)}`);
    }

    console.log(
      `  ${ansi.dim("progress")} ${progressBar(i + 1, fixtures.length)}`,
    );
  }

  const sec = ((Date.now() - started) / 1000).toFixed(1);
  console.log();
  console.log(`  ${ansi.dim(line())}`);
  console.log(
    `  ${ansi.ok("done")}  ${ansi.ok(`${ok.length} ok`)}` +
      (failed.length ? `  ${ansi.fail(`${failed.length} failed`)}` : "") +
      `  ${ansi.dim(`(${sec}s)`)}`,
  );
  console.log(`  ${ansi.dim("folder")} ${ansi.path(outDir)}`);

  if (failed.length) {
    console.log();
    for (const f of failed) {
      console.log(`  ${ansi.fail("•")} ${ansi.name(f.name)} — ${f.error}`);
    }
    process.exitCode = 1;
  }

  console.log();
}

main().catch((err) => {
  console.error(ansi.fail(String(err)));
  process.exitCode = 1;
});
