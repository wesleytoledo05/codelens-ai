import { Octokit } from "octokit";

const EXCLUDED_DIRS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
];

const EXCLUDED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".pdf",
  ".ico",
  ".woff",
  ".ttf",
  ".svg",
  ".mp3",
  ".mp4",
];

const EXCLUDED_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

const MAX_FILES = 300;
const CONCURRENCY = 20;

const PRIORITY_DIRS = ["src/", "app/", "lib/", "components/", ""];

type GitHubFile = {
  path: string;
  content: string;
  extension: string;
};

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

function shouldExcludePath(filePath: string): boolean {
  if (EXCLUDED_DIRS.some((dir) => filePath.startsWith(dir) || filePath.includes(`/${dir}`))) {
    return true;
  }
  const ext = filePath.substring(filePath.lastIndexOf("."));
  if (EXCLUDED_EXTENSIONS.includes(ext)) {
    return true;
  }
  const fileName = filePath.split("/").pop() || "";
  if (EXCLUDED_FILES.includes(fileName)) {
    return true;
  }
  return false;
}

function getDirPriority(filePath: string): number {
  for (let i = 0; i < PRIORITY_DIRS.length; i++) {
    if (filePath.startsWith(PRIORITY_DIRS[i])) return i;
  }
  return PRIORITY_DIRS.length;
}

async function fetchWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<GitHubFile | null>,
  concurrency: number
): Promise<GitHubFile[]> {
  const results: GitHubFile[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const result = await fn(items[i]);
      if (result) results.push(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function fetchRepositoryFiles(
  repoUrl: string,
  token?: string
): Promise<GitHubFile[]> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error("URL inválida. Use o formato: https://github.com/{owner}/{repo}");
  }

  const octokit = new Octokit(token ? { auth: token } : {});
  const { owner, repo } = parsed;

  // Step 1: Get file tree (single API call)
  let allPaths: string[] = [];
  try {
    const tree = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "true",
    });
    allPaths = tree.data.tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path || "");
  } catch {
    throw new Error(
      `Não foi possível acessar o repositório ${owner}/${repo}. Verifique se a URL está correta e se o repositório é público.`
    );
  }

  // Step 2: Filter and prioritize
  let relevantPaths = allPaths.filter((p) => !shouldExcludePath(p));

  if (relevantPaths.length > MAX_FILES) {
    relevantPaths.sort((a, b) => {
      const priorityA = getDirPriority(a);
      const priorityB = getDirPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.localeCompare(b);
    });
    relevantPaths = relevantPaths.slice(0, MAX_FILES);
  }

  // Step 3: Fetch content via raw URLs (fast, no API rate limit)
  const branch = "HEAD";
  const fetchFile = async (filePath: string): Promise<GitHubFile | null> => {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `token ${token}`;

      const response = await fetch(rawUrl, { headers, signal: AbortSignal.timeout(10000) });
      if (!response.ok) return null;

      const content = await response.text();
      const extension = filePath.substring(filePath.lastIndexOf("."));

      return { path: filePath, content, extension };
    } catch {
      return null;
    }
  };

  return fetchWithConcurrency(relevantPaths, fetchFile, CONCURRENCY);
}
