import { Router } from "express";
import * as fs from "fs";
import * as path from "path";

// --- Configuration Constants ---
const BASE_DIR = "/home/aapark/development/comfy-managed/input/00_pony";
const SUBDIRS = [
  "01_faces",
  "02_clothing",
  "03_posture",
  "04_b",
  "05_p",
  "06_actions",
];

// --- Plugin Info ---
export const info = {
  id: "pony-prompt", // This ID is used by SillyTavern
  name: "Pony Prompt",
  description:
    "Generates prompt components based on local text files for Pony Diffusion.",
};

// --- Helper Functions ---

/**
 * Reads a file, filters lines containing "=", and returns them.
 * @param filePath Absolute path to the file.
 * @returns Array of lines containing "=".
 */
function readAndFilterLines(filePath: string): string[] {
  try {
    // Try reading with utf-8 first, then latin1 as a fallback for broader compatibility
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (e) {
      console.warn(
        `[PonyPlugin] Failed to read ${filePath} as utf-8, trying latin1...`,
      );
      content = fs.readFileSync(filePath, "latin1");
    }

    return content
      .split(/\r?\n/) // Split by newline characters (Windows and Unix)
      .map((line) => line.trim())
      .filter((line) => line.includes("="));
  } catch (error) {
    console.warn(`[PonyPlugin] Error reading file ${filePath}:`, error);
    return [];
  }
}

/**
 * Gets a random line from the filtered lines of a file and extracts the text after the first "=".
 * @param filePath Absolute path to the file.
 * @returns The text after "=" or null if no suitable line is found.
 */
function getRandomLineAfterEquals(filePath: string): string | null {
  const lines = readAndFilterLines(filePath);
  if (lines.length === 0) {
    return null;
  }
  const randomLine = lines[Math.floor(Math.random() * lines.length)];
  const parts = randomLine.split("=", 2);
  return parts.length > 1 ? parts[1].trim() : null;
}

/**
 * Gets a random line (after "=") from a randomly selected file within a given subdirectory.
 * @param directory The subdirectory name (e.g., "01_faces") relative to BASE_DIR.
 * @returns A randomly selected prompt component string or null.
 */
function getRandomLineFromDir(directory: string): string | null {
  const dirPath = path.join(BASE_DIR, directory);
  try {
    let files = fs.readdirSync(dirPath).filter((file) => {
      try {
        return fs.statSync(path.join(dirPath, file)).isFile();
      } catch (statError) {
        console.warn(
          `[PonyPlugin] Error stating file ${path.join(dirPath, file)}:`,
          statError,
        );
        return false;
      }
    });

    if (files.length === 0) {
      console.warn(`[PonyPlugin] No files found in directory: ${dirPath}`);
      return null;
    }

    // Shuffle files (Fisher-Yates shuffle)
    for (let i = files.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [files[i], files[j]] = [files[j], files[i]];
    }

    for (const fileName of files) {
      const filePath = path.join(dirPath, fileName);
      const result = getRandomLineAfterEquals(filePath);
      if (result) {
        return result;
      }
    }
    console.warn(
      `[PonyPlugin] No valid lines found in any file in directory: ${dirPath}`,
    );
    return null;
  } catch (error) {
    console.warn(`[PonyPlugin] Error reading directory ${dirPath}:`, error);
    return null;
  }
}

/**
 * Builds the final string of generated prompt components.
 * @returns A string of space-separated prompt components.
 */
function buildGeneratedComponents(): string {
  const parts: string[] = [];
  for (const subdir of SUBDIRS) {
    const line = getRandomLineFromDir(subdir);
    if (line) {
      parts.push(line);
    }
  }
  // Your Python script joined with ", ". Let's stick to that for consistency.
  return parts.join(", ");
}

// --- Plugin Initialization ---
export async function init(router: Router): Promise<void> {
  console.log("[PonyPlugin] Initializing Pony Prompt Generator plugin...");

  router.post("/generate", (req, res) => {
    try {
      const userText = req.body.user_text || "";
      const generatedComponents = buildGeneratedComponents();

      let finalPrompt = "/imagine";
      if (userText.trim()) {
        finalPrompt += ` ${userText.trim()}`;
      }
      if (generatedComponents.trim()) {
        finalPrompt += ` ${generatedComponents.trim()}`;
      }

      if (
        finalPrompt === "/imagine" &&
        !userText.trim() &&
        !generatedComponents.trim()
      ) {
        // If nothing was generated and no user text, send a specific message or an error
        console.warn("[PonyPlugin] No user text and no components generated.");
        res.status(400).json({
          error:
            "No prompt components could be generated and no user text was provided.",
        });
        return;
      }

      res.json({ full_prompt: finalPrompt });
    } catch (error) {
      console.error("[PonyPlugin] Error in /generate endpoint:", error);
      res
        .status(500)
        .json({ error: "Internal server error while generating prompt." });
    }
  });

  console.log(
    "[PonyPlugin] Pony Prompt Generator plugin initialized with POST /generate endpoint.",
  );
  return Promise.resolve();
}

// Optional exit function (can be uncommented if needed later)
// export async function exit(): Promise<void> {
//     console.log('[PonyPlugin] Exiting Pony Prompt Generator plugin.');
//     return Promise.resolve();
// }
