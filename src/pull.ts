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

  const newFiles: Array<{ commit: string; file: string }> = []
  const instructions: Array<{
    commit: { sha: string; message: string }
    skip: boolean
  }> = []
  console.time("Fetched commits")
  const commits = await getCommitsBetween(repoPath, initialHash!)
  console.log(`Found ${commits.length} commits`)
  console.timeEnd("Fetched commits")

  if (commits.length === 0) {
    console.log("No new commits to process")
    return
  }

  console.log("Creating patches later than", initialHash)
  for (const commit of commits) {
    if (await shouldApply(repoPath, commit, newFiles)) {
      instructions.push({ commit, skip: false })

      const changedFiles = await getChangedFiles(repoPath, commit.sha)
      for (const { status, file } of changedFiles) {
        if (status === "A") {
          newFiles.push({ commit: commit.sha, file })
        }
      }
    } else {
      instructions.push({ commit, skip: true })
    }
  }
  console.time("Applied commits")
  if (dryRun) {
    console.log(chalk.yellow("Dry run mode: No files will be modified"))
  }
  const context = { patchNumber: 0 }
  for (const { commit, skip } of instructions) {
    if (!skip) {
      await createCommitPatch(repoPath, commit, targetDir, context)
    } else {
      console.log(
        chalk.yellow(`#${commit.sha.substring(0, 7)}: SKIP `) +
          `${commit.message}`
      )
    }
  }

  console.timeEnd("Applied commits")
  console.timeEnd("Total time to update")

  function cleanPath(path: string) {
    return path.replace(process.cwd(), "")
  }

  async function gitCommand(command: string, repoPath: string) {
    return execSync(command, {
      encoding: "utf8",
      cwd: repoPath,
    }).trim()
  }

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

  async function getCommitsBetween(
    repoPath: string,
    startHash: string,
    endHash: string = "HEAD"
  ) {
    const output = await gitCommand(
      `git log --reverse --pretty=format:"%H|%s" ${startHash}..${endHash}`,
      repoPath
    )
    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, message] = line.split("|")
        if (!sha || !message) throw new Error("Invalid git log output")

        return { sha, message }
      })
  }

  async function getChangedFiles(repoPath: string, sha: string) {
    const output = await gitCommand(
      `git diff-tree --no-commit-id --name-status -r ${sha}`,
      repoPath
    )
    return output.split("\n").map((line) => {
      const [status, file] = line.split("\t")
      if (!status || !file) throw new Error("Invalid git diff-tree output")

      return { status, file }
    })
  }

  async function shouldApply(
    repoPath: string,
    commit: { sha: string },
    newFiles: Array<{ commit: string; file: string }>
  ) {
    const changedFiles = await getChangedFiles(repoPath, commit.sha)
    for (const { status, file } of changedFiles) {
      if (status === "A") {
        return true // New file created
      }
      if (fs.existsSync(path.join(targetDir, file))) {
        return true // File exists in target directory
      }
      if (newFiles.some((newFile) => newFile.file === file)) {
        return true // File is in the newFiles array
      }
    }
    return false // Only modifies files we don't have
  }

  async function getFileDiff(repoPath: string, sha: string, file: string) {
    try {
      let diff = await gitCommand(
        `git diff --unified=3 ${sha}^ ${sha} -- "${file}"`,
        repoPath
      )

      if (diff && !diff.endsWith("\n")) {
        diff = diff + "\n"
      }

      return diff
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `Error getting diff for ${file} at ${sha}: ${error.message}`
        )
      }
      return null
    }
  }

  function shouldIgnorePath(file: string) {
    return ignoredPaths.some(
      (ignoredPath) =>
        file === ignoredPath || file.startsWith(`${ignoredPath}/`)
    )
  }

  async function createCommitPatch(
    repoPath: string,
    commit: { sha: string; message: string },
    targetDir: string,
    context: { patchNumber: number }
  ) {
    const hash = commit.sha.substring(0, 7)
    console.log(chalk.green(`#${hash}: `) + `${commit.message}`)

    const changedFiles = await getChangedFiles(repoPath, commit.sha)
    for (const { status, file } of changedFiles) {
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
          let diff = await gitCommand(
            `git diff --no-index /dev/null ${file} | cat`,
            repoPath
          )
          if (diff) {
            if (!dryRun) {
              const patchPath = path.join(
                targetDir,
                "patches",
                `${(context.patchNumber++)
                  .toString()
                  .padStart(4, "0")}.${hash}.patch`
              )
              fs.writeFileSync(patchPath, diff)
            }
          }
          break
        case "M":
          if (fs.existsSync(targetPath)) {
            let diff = await getFileDiff(repoPath, commit.sha, file)
            if (diff) {
              if (!dryRun) {
                const patchPath = path.join(
                  targetDir,
                  "patches",
                  `${(context.patchNumber++)
                    .toString()
                    .padStart(4, "0")}.${hash}.patch`
                )
                fs.mkdirSync(path.dirname(patchPath), { recursive: true })

                const targetFileContent = fs.readFileSync(targetPath, "utf-8")
                const correctedPatch = correctPatch(diff, targetFileContent)
                fs.writeFileSync(patchPath, correctedPatch)
              }
            }
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
              const diff = `
  diff --git a/${file} b/${file}
  deleted file mode 100644
  index ${hash}..0000000
  --- a/${file}
  +++ /dev/null
  `

              const patchPath = path.join(
                targetDir,
                "patches",
                `${(context.patchNumber++)
                  .toString()
                  .padStart(4, "0")}.${hash}.patch`
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
              const diff = `
  diff --git a/${file} b/${file}
  deleted file mode 100644
  index ${hash}..0000000
  --- a/${file}
  +++ /dev/null
  `

              const patchPath = path.join(
                targetDir,
                "patches",
                `${(context.patchNumber++)
                  .toString()
                  .padStart(4, "0")}.${hash}.patch`
              )
              fs.writeFileSync(patchPath, diff)
            }
            console.log(
              dryRun ? "(dry run)" : "",
              chalk.magenta("R"),
              `${file}`
            )
          } else {
            console.log(
              dryRun ? "(dry run)" : "",
              chalk.magenta("SKIP R"),
              `${file} (not found)`
            )
          }
          break
        default:
          console.log(
            chalk.gray(`Unhandled status ${status} for file: ${file}`)
          )
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
    newPackageJson["epic-stack"].head = commit.sha

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
          `${(context.patchNumber++).toString().padStart(4, "0")}.${hash}.patch`
        )
        fs.writeFileSync(
          patchPath,
          correctPatch(diff, JSON.stringify(newPackageJson, null, 2))
        )
      }
    }
  }
}
