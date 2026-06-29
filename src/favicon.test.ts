import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("favicon assets", () => {
  it("references every browser icon from the document head", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('/favicon.svg?v=1');
    expect(html).toContain('/favicon-32x32.png?v=1');
    expect(html).toContain('/favicon-16x16.png?v=1');
    expect(html).toContain('/apple-touch-icon.png?v=1');
    expect(html).toContain('<meta name="theme-color" content="#17120c"');
  });

  it("keeps the SVG source and rendered PNG variants in public", () => {
    const publicDir = resolve(process.cwd(), "public");
    const svg = readFileSync(resolve(publicDir, "favicon.svg"), "utf8");

    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain("#17120c");
    expect(svg).toContain("#dca34c");
    expect(existsSync(resolve(publicDir, "favicon-32x32.png"))).toBe(true);
    expect(existsSync(resolve(publicDir, "favicon-16x16.png"))).toBe(true);
    expect(existsSync(resolve(publicDir, "apple-touch-icon.png"))).toBe(true);
  });
});
