/**
 * scripts/scan-copy.ts
 * CI forbidden-vocabulary scanner.
 * Implements M-3 (PRD) — zero occurrences of forbidden vocabulary in fan-facing UI.
 *
 * Fails (exit code 1) if any of the forbidden words appear in src/
 * outside the src/app/advanced/ directory and outside comments.
 *
 * Forbidden words (PRD LR-1):
 *   NFT, mint, token, blockchain, crypto, wallet
 *   (case-insensitive)
 *
 * Usage:
 *   pnpm scan-copy
 *   (also run in CI before build)
 */

import * as fs   from "node:fs";
import * as path from "node:path";

const FORBIDDEN = [/\bNFT\b/i, /\bmint\b/i, /\btoken\b/i, /\bblockchain\b/i, /\bcrypto\b/i, /\bwallet\b/i];

// Directories and files exempt from the scan
const EXEMPTIONS = [
  "src/app/advanced",     // Chidi path — technical vocabulary allowed (PRD LR-1)
  "src/app/api",          // API route handlers — server-side backend, not fan-facing UI
  "src/server",           // Backend — not fan-facing
  "src/utils",            // Supabase client utilities — not fan-facing
  "scripts",              // Dev scripts — not fan-facing
  "src/lib/score.ts",     // Pure formula — no strings
];

const ROOT = path.join(process.cwd(), "src");

interface Violation {
  file: string;
  line: number;
  col:  number;
  word: string;
  text: string;
}

function isExempt(filePath: string): boolean {
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return EXEMPTIONS.some(ex => rel.startsWith(ex));
}

function scanFile(filePath: string): Violation[] {
  if (isExempt(filePath)) return [];

  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines   = content.split("\n");

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo]!;

    // Skip comment lines (// ... and * ...)
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

    for (const pattern of FORBIDDEN) {
      const match = pattern.exec(line);
      if (match) {
        violations.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNo + 1,
          col:  match.index + 1,
          word: match[0],
          text: line.trim(),
        });
      }
    }
  }

  return violations;
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const files      = walkDir(ROOT);
const violations = files.flatMap(scanFile);

if (violations.length === 0) {
  console.log("✅ scan-copy: no forbidden vocabulary found in fan-facing src/");
  process.exit(0);
} else {
  console.error(`\n❌ scan-copy: found ${violations.length} forbidden vocabulary violation(s)\n`);

  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}:${v.col}  "${v.word}"`);
    console.error(`    ${v.text}\n`);
  }

  console.error(`\nForbidden words in fan-facing UI: NFT, mint, token, blockchain, crypto, wallet`);
  console.error(`See PRD LR-1 and copy all strings through src/lib/copy.ts\n`);
  process.exit(1);
}
