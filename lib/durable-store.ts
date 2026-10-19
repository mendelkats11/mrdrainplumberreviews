import { promises as fs } from "fs";
import os from "os";
import path from "path";

// Small JSON files the site writes while it runs: the Google links saved in
// the admin screen, and the list of copied reviews. A redeploy can replace the
// whole app folder, taking a file there with it. So every file is written to
// several places and read back from all of them:
//
//   1. the app's own data folder (always has to work)
//   2. a hidden folder in the hosting account's home directory
//   3. a folder next to the app folder
//   4. REVIEW_BACKUP_DIR, if that environment variable is set
//
// The home folder is the likeliest to survive a deploy. The other places are
// best effort; one that cannot be written is simply skipped.

const PRIMARY_DIR = path.join(process.cwd(), "data");

function backupDirs(): string[] {
  const dirs = [
    process.env.REVIEW_BACKUP_DIR,
    path.join(os.homedir(), ".mrdrain-review-data"),
    path.join(path.dirname(process.cwd()), "review-site-data"),
  ].filter((d): d is string => Boolean(d));
  return [...new Set(dirs)];
}

export const STORE_DIRS: Array<{ label: string; dir: string }> = [
  { label: "app folder", dir: PRIMARY_DIR },
  ...backupDirs().map((dir) => ({
    label: dir === process.env.REVIEW_BACKUP_DIR ? "backup folder (set by REVIEW_BACKUP_DIR)" : dir.includes(".mrdrain-review-data") ? "home folder" : "folder next to the app",
    dir,
  })),
];

export const LOCK_PARENT = PRIMARY_DIR;

// The parsed contents of one store's copy of a file, or null if it is missing
// or unreadable.
export async function readFrom(dir: string, name: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, name), "utf8"));
  } catch {
    return null;
  }
}

// Every store's copy of a file, in the order of STORE_DIRS.
export async function readAll(name: string): Promise<Array<{ label: string; dir: string; value: unknown | null }>> {
  return Promise.all(STORE_DIRS.map(async (s) => ({ ...s, value: await readFrom(s.dir, name) })));
}

// Writes to a temp file and renames it into place, so a crash mid-write cannot
// leave truncated JSON behind. Windows can refuse a rename while another
// process is reading, so it retries a few times.
async function writeOne(dir: string, name: string, data: unknown): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data));
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (error) {
      if (attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

// Writes the file to every store. The app folder must work (otherwise this
// throws); the others are best effort. Returns the labels that were written.
export async function writeAll(name: string, data: unknown): Promise<string[]> {
  const written: string[] = [];
  for (const [i, s] of STORE_DIRS.entries()) {
    try {
      await writeOne(s.dir, name, data);
      written.push(s.label);
    } catch (error) {
      if (i === 0) throw error;
    }
  }
  return written;
}
