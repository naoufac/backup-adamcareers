import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  transpilePackages: ["@adamjobs/export-engine", "jspdf", "jspdf-autotable"],
};

export default nextConfig;
