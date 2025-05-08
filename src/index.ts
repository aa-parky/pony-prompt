import * as fs from "fs";
import * as path from "path";
import { Request, Response, Router } from "express";

// --- Configuration ---
// IMPORTANT: This path needs to be accessible by the SillyTavern server process.
const BASE_DIR = "/home/aapark/development/comfy-managed/input/00_pony";
const SUBDIRS = [
  "01_faces",
  "02_clothing",
  "03_posture",
  "04_b",
  "05_p",
  "06_actions",
];

// --- Helper Functions ---

/**
 * Reads a file, filters lines containing "=", and returns them.
 * @param filePath Absolute path to the file.
 * @returns Array of lines containing "=".
 */
function readAndFilterLines(filePath: string): string[] {
  try {
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
      .split(/\r?\n/)
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
  if (parts.length > 1) {
    if (typeof parts[1] === "string") {
      return parts[1].trim();
    } else {
      console.warn(
        `[PonyPlugin] Unexpected non-string value for parts[1] in file ${filePath}, line: "${randomLine}". parts[1] is:`,
        parts[1],
      );
      return null;
    }
  } else {
    return null;
  }
}

function buildGeneratedComponents(
  baseDir: string,
  subdirs: string[],
): string[] {
  const components: string[] = [];
  for (const subdir of subdirs) {
    const dirPath = path.join(baseDir, subdir);
    try {
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const files = fs
          .readdirSync(dirPath)
          .filter((file) => file.endsWith(".txt"));
        if (files.length > 0) {
          const randomFile = files[Math.floor(Math.random() * files.length)];
          const randomFilePath = path.join(dirPath, randomFile);
          const component = getRandomLineAfterEquals(randomFilePath);
          if (component !== null && component.trim() !== "") {
            components.push(component.trim());
          }
        }
      } else {
        console.warn(
          `[PonyPlugin] Directory not found or not a directory: ${dirPath}`,
        );
      }
    } catch (err: any) {
      console.warn(
        `[PonyPlugin] Error processing directory ${dirPath}:`,
        err.message,
      );
    }
  }
  return components;
}

// --- Plugin Definition (Exported) ---
export const info = {
  id: "pony-prompt",
  name: "Pony Prompt Generator",
  description:
    "Generates prompt components for Pony Diffusion from local text files.",
  version: "1.0.0",
  author: "Your Name", // Replace with your name/username
  website: "",
  tags: ["text-generation", "utility"],
};

export async function init(router: Router): Promise<void> {
  // Can be async
  console.log(
    "[PonyPlugin] Initializing Pony Prompt Generator plugin (full logic)...",
  );

  router.post("/generate", (req: Request, res: Response) => {
    try {
      const userText = req.body.user_text || "";
      console.log(`[PonyPlugin] Received user_text: "${userText}"`);

      const generatedComponents = buildGeneratedComponents(BASE_DIR, SUBDIRS);

      let finalPrompt = userText.trim();
      if (generatedComponents.length > 0) {
        if (finalPrompt.length > 0) {
          finalPrompt += " ";
        }
        finalPrompt += generatedComponents.join(", ");
      }

      if (finalPrompt.trim().length > 0) {
        finalPrompt = `/imagine ${finalPrompt.trim()}`;
      } else if (
        userText.trim().length === 0 &&
        generatedComponents.length === 0
      ) {
        console.log(
          "[PonyPlugin] No user text and no components generated. Returning empty prompt.",
        );
        // Return empty prompt or a specific message if nothing is generated
      }

      console.log(`[PonyPlugin] Generated full_prompt: "${finalPrompt}"`);
      res.json({ full_prompt: finalPrompt });
    } catch (error: any) {
      console.error(
        "[PonyPlugin] Error in /generate endpoint:",
        error.message,
        error.stack,
      );
      res
        .status(500)
        .json({ error: "Internal server error while generating prompt." });
    }
  });

  console.log(
    "[PonyPlugin] Pony Prompt Generator plugin initialized with POST /generate endpoint (full logic).",
  );
  return Promise.resolve();
}
