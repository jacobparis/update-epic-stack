import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { correctPatch } from "./patch.js"

export async function pull({
  projectRoot,
  targetDir,
  initialHash,
  ignoredPaths,
  dryRun = false,
}: {
  projectRoot: string
  targetDir: string
  initialHash: string
  ignoredPaths: string[]
  dryRun?: boolean
}) {
  const repoUrl = "https://github.com/epicweb-dev/epic-stack.git"
  const repoPath = path.join(
    projectRoot,
    "node_modules",
    "@epic-web",
    "epic-stack"
  )

  console.time("Total time to update")

  console.time("Pulled latest changes")
  await cloneOrUpdateRepo()
  console.timeEnd("Pulled latest changes")

  console.time("Fetched squashed diffs")
  const diffs = await getSquashedDiffsBetween(repoPath, initialHash)
  console.log(`Found ${diffs.length} diffs`)
  console.timeEnd("Fetched diffs")

  if (diffs.length === 0) {
    console.log("No new diffs to process")
    return
  }

  const hash = initialHash.substring(0, 7)
  console.log(chalk.green(`#${hash}: `))
  const context = { patchNumber: 0 }
  for (const { diff, file, status } of diffs) {
    if (shouldIgnorePath(file)) {
      console.log(
        dryRun ? "(dry run)" : "",
        chalk.yellow(`SKIP ${status}`),
        `${file}`,
        "(ignored)"
      )
      continue
    }

    const targetPath = path.join(targetDir, file)

    switch (status) {
      case "A":
        if (!dryRun) {
          const patchPath = path.join(
            targetDir,
            "patches",
            `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
          )
          fs.writeFileSync(patchPath, diff)
        }
        console.log(dryRun ? "(dry run)" : "", chalk.green("A"), `${file}`)
        break
      case "M":
        if (fs.existsSync(targetPath)) {
          if (!dryRun) {
            const patchPath = path.join(
              targetDir,
              "patches",
              `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
            )
            fs.mkdirSync(path.dirname(patchPath), { recursive: true })

            const targetFileContent = fs.readFileSync(targetPath, "utf-8")
            const correctedPatch = correctPatch(diff, targetFileContent)
            fs.writeFileSync(patchPath, correctedPatch)
          }
          console.log(dryRun ? "(dry run)" : "", chalk.cyan("M"), `${file}`)
        } else {
          console.log(
            dryRun ? "(dry run)" : "",
            chalk.yellow("SKIP M"),
            `${file} (not found)`
          )
        }
        break
      case "D":
        if (fs.existsSync(targetPath)) {
          if (!dryRun) {
            const patchPath = path.join(
              targetDir,
              "patches",
              `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
            )
            fs.writeFileSync(patchPath, diff)
          }
          console.log(dryRun ? "(dry run)" : "", chalk.red("D"), `${file}`)
        } else {
          console.log(
            dryRun ? "(dry run)" : "",
            chalk.red("SKIP D"),
            `${file} (not found)`
          )
        }
        break
      case "R":
        if (fs.existsSync(targetPath)) {
          if (!dryRun) {
            const patchPath = path.join(
              targetDir,
              "patches",
              `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
            )
            fs.writeFileSync(patchPath, diff)
          }
          console.log(dryRun ? "(dry run)" : "", chalk.magenta("R"), `${file}`)
        } else {
          console.log(
            dryRun ? "(dry run)" : "",
            chalk.magenta("SKIP R"),
            `${file} (not found)`
          )
        }
        break
      default:
        console.log(chalk.gray(`Unhandled status ${status} for file: ${file}`))
    }
  }
  // Pathc package.json with the new commit hash
  const packageJsonPath = path.join(repoPath, "package.json")
  if (!fs.existsSync(`${packageJsonPath}.tmp`)) {
    fs.copyFileSync(packageJsonPath, `${packageJsonPath}.tmp`)
  }

  const newPackageJson = JSON.parse(
    fs.readFileSync(`${packageJsonPath}.tmp`, "utf-8")
  )
  if (
    !newPackageJson["epic-stack"] ||
    typeof newPackageJson["epic-stack"] !== "object"
  ) {
    newPackageJson["epic-stack"] = {}
  }
  newPackageJson["epic-stack"].head = initialHash

  if (!dryRun) {
    // copy package.json to package.json.tmp
    fs.writeFileSync(
      `${repoPath}/package.json.tmp.tmp`,
      JSON.stringify(newPackageJson, null, 2) + "\n"
    )
    let diff = await gitCommand(
      `git diff --no-index package.json.tmp package.json.tmp.tmp | cat`,
      repoPath
    )
    fs.unlinkSync(`${repoPath}/package.json.tmp.tmp`)
    fs.writeFileSync(
      `${repoPath}/package.json.tmp`,
      JSON.stringify(newPackageJson, null, 2) + "\n"
    )
    if (diff) {
      const patchPath = path.join(
        targetDir,
        "patches",
        `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
      )
      fs.writeFileSync(
        patchPath,
        correctPatch(diff, JSON.stringify(newPackageJson, null, 2))
      )
    }
  }

  console.timeEnd("Applied commits")
  console.timeEnd("Total time to update")

  async function cloneOrUpdateRepo() {
    if (fs.existsSync(repoPath)) {
      const currentHash = await gitCommand("git rev-parse HEAD", repoPath)
      if (currentHash === initialHash) {
        console.log(cleanPath(repoPath), "is up to date")
        return
      }
      console.log("Updating", cleanPath(repoPath))
      await gitCommand("git fetch --quiet", repoPath)
    } else {
      console.log("Cloning latest epic-stack to", cleanPath(repoPath))
      fs.mkdirSync(repoPath, { recursive: true })
      await gitCommand(
        `git clone --quiet ${repoUrl} ${repoPath}`,
        path.dirname(repoPath)
      )
    }
  }

  async function getSquashedDiffsBetween(
    repoPath: string,
    startHash: string,
    endHash: string = "HEAD"
  ) {
    const output = await gitCommand(
      `git diff ${startHash} ${endHash} | cat`,
      repoPath
    )
    const diffs: Array<{
      diff: string
      file: string
      status: "A" | "D" | "R" | "M"
    }> = []
    const lines = output.split("\n")
    let currentDiff = ""
    let file = ""
    let status: "A" | "D" | "R" | "M" = "M"
    let capturing = false

    const getStatusFromLine = (line: string) => {
      if (line.startsWith("new file")) return "A" as const
      if (line.startsWith("deleted")) return "D" as const
      if (line.startsWith("rename")) return "R" as const
      return "M" as const // If none of the above, assume modified
    }

    for (const line of lines) {
      if (line.startsWith("diff --git a/")) {
        if (capturing && file) {
          diffs.push({ diff: currentDiff.trim(), file, status })
        }
        file = line.split(" ")[2].slice(2) // Extract file after 'a/'
        status = "M" // Reset status for new diff block
        currentDiff = line + "\n"
        capturing = true
      } else {
        if (capturing) {
          if (
            line.startsWith("new file") ||
            line.startsWith("deleted") ||
            line.startsWith("rename")
          ) {
            status = getStatusFromLine(line)
          }
          currentDiff += line + "\n"
        }
      }
    }

    // To capture the last diff in the text
    if (capturing && file) {
      diffs.push({ diff: currentDiff.trim(), file, status })
    }

    return diffs
  }

  function shouldIgnorePath(file: string) {
    return ignoredPaths.some(
      (ignoredPath) =>
        file === ignoredPath || file.startsWith(`${ignoredPath}/`)
    )
  }
}

// TODO: can we stream this?
async function gitCommand(command: string, repoPath: string) {
  return execSync(command, {
    encoding: "utf8",
    cwd: repoPath,
    maxBuffer: 1024 * 1024 * 1024,
  }).trim()
}

function cleanPath(path: string) {
  return path.replace(process.cwd(), "")
}
