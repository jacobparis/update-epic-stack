#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { pull } from "./pull"
import { apply } from "./apply"

const args = process.argv.slice(2)

const projectRoot = args.includes("--project")
  ? args[args.indexOf("--project") + 1]
  : process.cwd()
const targetDir = args.includes("--target")
  ? args[args.indexOf("--target") + 1]
  : process.cwd()

const dryRun = args.includes("--dry-run")

let initialHash = args.includes("--hash")
  ? args[args.indexOf("--hash") + 1]
  : null

const packageJsonPath = path.join(targetDir, "package.json")
if (!fs.existsSync(packageJsonPath)) {
  throw new Error("package.json not found")
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
const epicStackConfig = packageJson["epic-stack"] || {}

// Read initialHash if not provided
if (!initialHash) {
  initialHash = epicStackConfig.head as string

  if (!epicStackConfig.head) {
    console.error(
      "Error: Could not read package.json#epic-stack.head. Is this an Epic Stack app? You can also provide a --hash argument."
    )
    process.exit(1)
  }
}

const command = args[0] as "pull" | "apply"
if (command === "pull") {
  const defaultIgnoredPaths = [
    "remix.init",
    "LICENSE.md",
    "CONTRIBUTING.md",
    "docs",
    "tests/e2e/notes.test.ts",
    "tests/e2e/search.test.ts",
    ".github/workflows/version.yml",
    "package-lock.json",
    "yarn.lock",
  ]

  const ignoredPaths: Array<string> = [...defaultIgnoredPaths]

  // Read ignoredPaths from package.json#epic-stack
  const additionalIgnoredPaths = epicStackConfig.ignoredPaths || []
  ignoredPaths.push(...additionalIgnoredPaths)

  // Add custom ignore paths from command line arguments
  args.forEach((arg, i) => {
    if (arg === "--ignore") {
      const ignoredPath = args[i + 1]
      if (!ignoredPath) throw new Error("Ignored path not provided")

      ignoredPaths.push(ignoredPath)
    }
  })

  await pull({
    projectRoot,
    targetDir,
    initialHash,
    ignoredPaths,
    dryRun,
  })
} else if (command === "apply") {
  await apply({
    projectRoot,
    targetDir,
    initialHash,
  })
} else {
  console.error(`Unknown command: ${command}`)
  process.exit(1)
}

process.exit(0)
