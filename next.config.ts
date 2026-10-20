import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;

let repo = "";
if (isGithubActions) {
  const repoEnv = process.env.GITHUB_REPOSITORY;
  if (repoEnv) {
    repo = repoEnv.replace(/.*?\//, "");
  }
}

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubActions ? `/${repo}` : "",
  assetPrefix: isGithubActions ? `/${repo}/` : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;