import { exec } from "child_process"
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "fs"
import { join, resolve } from "path"
import readline from "readline"
import chalk from "chalk"

export async function apply({
  projectRoot,
  targetDir,
  initialHash,
}: {
  projectRoot: string
  targetDir: string
  initialHash: string
}) {
  const PATCH_DIR = resolve(targetDir, "./patches")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const patches = readdirSync(PATCH_DIR)
    .filter((file) => file.endsWith(".patch"))
    .sort()

  for (let i = 0; i < patches.length; i++) {
    const patch = patches[i]
    const patchPath = join(PATCH_DIR, patch)

    await applyPatch(patchPath)
    renameSync(patchPath, patchPath.replace(".patch", ".patch.applied"))
  }

  rl.close()

  async function applyPatch(patch: string) {
    const applyPatchCommand = `patch -F10 --batch  --ignore-whitespace --no-backup-if-mismatch`
    const patchContents = readFileSync(patch, "utf8")

    const originFile = patchContents.match(/---\s+(.+?)\s+/)?.[1]
    const targetFile = originFile?.replace("a/", "")

    const operation = patchContents.includes("deleted file")
      ? "D"
      : patchContents.includes("new file")
      ? "A"
      : "M"

    const trimmedPatchPath = patch.replace(projectRoot, "")
    console.time(`Applying… ${trimmedPatchPath}`)

    if (operation === "D") {
      unlinkSync(join(targetDir, targetFile!))
      console.timeEnd(`Applying… ${trimmedPatchPath}`)
      return
    }

    if (operation === "M" || operation === "A") {
      try {
        await command(`${applyPatchCommand} < ${patch}`)
        console.timeEnd(`Applying… ${trimmedPatchPath}`)
      } catch (error) {
        console.timeEnd(`Applying… ${trimmedPatchPath}`)
        if (existsSync(join(targetDir, `${targetFile}.rej`))) {
          console.time("Resolving conflicts…")
          try {
            await command(
              `${applyPatchCommand} ${targetFile} < ${targetFile}.rej`
            )
            if (existsSync(join(targetDir, `${targetFile}.rej`))) {
              unlinkSync(join(targetDir, `${targetFile}.rej`))
            } else {
              throw new Error("Reject didn't exist")
            }

            if (existsSync(join(targetDir, `${targetFile}.orig`))) {
              unlinkSync(join(targetDir, `${targetFile}.orig`))
            }

            if (existsSync(join(targetDir, `${targetFile}.rej.orig`))) {
              unlinkSync(join(targetDir, `${targetFile}.rej.orig`))
            }

            console.timeEnd("Resolving conflicts…")
            resolve()
            return
          } catch (rejectError) {
            console.log(`Patch rejected for ${targetFile}`)
            console.log(
              formatPatch(
                readFileSync(join(targetDir, `${targetFile}.rej`), "utf8"),
                join(targetDir, targetFile ?? "").replace(process.cwd(), "")
              ).replace("\t", "  ")
            )
          }
        } else {
          console.log(`Error detected while applying ${trimmedPatchPath}`)
          console.log(
            formatPatch(
              patchContents,
              join(targetDir, targetFile ?? "").replace(process.cwd(), "")
            ).replace("\t", "  ")
          )
        }

        await new Promise<void>((resolve) => {
          rl.question(
            "Please resolve the conflict, stage the changes, and press Enter to continue...",
            () => resolve()
          )
        })
      }
    }
  }

  function formatPatch(patch: string, filename: string) {
    return patch
      .split("\n")
      .map((line) => {
        if (line.startsWith("@@")) {
          const startingLine = line.slice(4).split(",")[0]
          return chalk.magenta(line) + ` ${filename}:${startingLine}`
        }

        if (line.startsWith("+")) {
          return chalk.green(line.slice(1))
        }

        if (line.startsWith("-")) {
          return chalk.red(line.slice(1))
        }

        if (line.startsWith(" ")) {
          return chalk.dim(line.slice(1))
        }

        return line
      })
      .join("\n")
  }

  async function command(command: string) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: targetDir }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve(stdout)
        }
      })
    })
  }
}
