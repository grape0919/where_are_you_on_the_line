import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

function shimEnvFileForVitest() {
  const projectRoot = __dirname;
  const envPath = path.resolve(projectRoot, ".env");
  const envTestPath = path.resolve(projectRoot, ".env.test");
  if (!fs.existsSync(envTestPath)) {
    return;
  }
  const originalReadFileSync = fs.readFileSync.bind(fs);
  const envBuffer = originalReadFileSync(envTestPath);
  type ReadFileSyncOptions = Parameters<typeof fs.readFileSync>[1];

  const toResolvedString = (target: fs.PathOrFileDescriptor): string | null => {
    if (typeof target === "string") {
      return path.resolve(target);
    }
    return null;
  };

  const getStringOutput = (
    source: Buffer,
    options?: ReadFileSyncOptions
  ) => {
    if (!options) {
      return Buffer.from(source);
    }
    if (typeof options === "string") {
      return source.toString(options);
    }
    if (typeof options === "object" && options && "encoding" in options) {
      const encoding = options.encoding;
      if (typeof encoding === "string") {
        return source.toString(encoding);
      }
    }
    return Buffer.from(source);
  };

  fs.readFileSync = ((filePath: fs.PathOrFileDescriptor, options?: ReadFileSyncOptions) => {
    const resolved = toResolvedString(filePath);
    if (resolved && resolved === envPath) {
      return getStringOutput(envBuffer, options);
    }
    return originalReadFileSync(filePath, options);
  }) as typeof fs.readFileSync;
}

shimEnvFileForVitest();

export default defineConfig({
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.ts?(x)"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      enabled: false,
    },
  },
});
