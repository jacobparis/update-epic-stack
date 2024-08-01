type LineType = "retain" | "add" | "remove"

interface Line {
  type: LineType
  content: string
}

class Hunk {
  startLinePreEdit: number
  hunkLenPreEdit: number
  startLinePostEdit: number
  hunkLenPostEdit: number
  lines: Line[]
  categoryCounts: { [key in LineType]: number }
  isNewFile: boolean
  forwardBlockLen: number // Assuming this property exists

  constructor(
    startLinePreEdit: number,
    hunkLenPreEdit: number,
    startLinePostEdit: number,
    hunkLenPostEdit: number,
    lines: Line[]
  ) {
    this.forwardBlockLen = 3
    this.startLinePreEdit = startLinePreEdit
    this.hunkLenPreEdit = hunkLenPreEdit
    this.startLinePostEdit = startLinePostEdit
    this.hunkLenPostEdit = hunkLenPostEdit
    this.categoryCounts = { retain: 0, add: 0, remove: 0 }
    this.lines = lines
    this.isNewFile =
      this.categoryCounts.retain === 0 && this.categoryCounts.remove === 0
    this.addLines(lines)
  }

  addLines(newLines: Line[]): void {
    for (const line of newLines) {
      this.lines.push(line)
      this.categoryCounts[line.type]++
    }
  }

  hunkToString(): string {
    let string = `@@ -${this.startLinePreEdit},${this.hunkLenPreEdit} +${this.startLinePostEdit},${this.hunkLenPostEdit} @@\n`
    for (const line of this.lines) {
      const prefix =
        line.type === "retain" ? " " : line.type === "add" ? "+" : "-"
      string += `${prefix}${line.content}\n`
    }
    return string
  }

  validateAndCorrect(linesDict: { [key: number]: string }): {
    isValid: boolean
    message: string
  } {
    const problems: string[] = []
    const isValid = this.validateLines(linesDict, problems)

    return {
      isValid,
      message: problems.join("\n"),
    }
  }

  validateLines(linesDict: { [key: number]: string }, problems: string[]) {
    let hunkInd = 0
    let fileInd = this.startLinePreEdit
    const maxLineNumber = Math.max(...Object.keys(linesDict).map(Number))

    let foundActionableLine = false
    while (hunkInd < this.lines.length && fileInd <= maxLineNumber) {
      const line = this.lines[hunkInd]
      if (!line) continue

      if (line.type === "add") {
        foundActionableLine = true
        hunkInd++
      } else if (line.type === "retain") {
        const linesAhead = this.lines.slice(hunkInd + 1)
        if (
          (linesAhead.length === 0 && line.content === "") ||
          this.lines.filter((l) => l.type === "remove").length >=
            this.lines.filter((l) => l.type === "add").length
        ) {
          // Remove line of context
          this.popLine(line, hunkInd)
          hunkInd--
          fileInd--
          // fileInd++
          if (!foundActionableLine) {
            this.startLinePreEdit++
            this.startLinePostEdit++
          }
        }

        hunkInd++
        fileInd++
      } else if (!isSimilar(line.content, linesDict[fileInd])) {
        const forwardCode = this.getForwardBlock(linesDict, fileInd)
        const forwardBlock = this.makeForwardBlock(hunkInd)
        const origCountRatio = weightedStringSimilarity(
          forwardBlock,
          forwardCode
        )

        const forwardBlockMissingLine = this.makeForwardBlock(
          hunkInd,
          this.forwardBlockLen - 1
        )
        const missingLineBlock = `${linesDict[fileInd]}\n${forwardBlockMissingLine}`
        const missingLineCountRatio = weightedStringSimilarity(
          missingLineBlock,
          forwardCode
        )

        const forwardBlockFalseLine = this.makeForwardBlock(hunkInd + 1)
        const falseLineCountRatio = weightedStringSimilarity(
          forwardBlockFalseLine,
          forwardCode
        )

        if (
          origCountRatio >= missingLineCountRatio &&
          origCountRatio >= falseLineCountRatio
        ) {
          problems.push(
            `In Hunk:${this.hunkToString()}, there was at least one mismatch.`
          )
          // return false
          hunkInd++
        } else if (missingLineCountRatio > falseLineCountRatio) {
          // this.addRetainedLine(linesDict[fileInd], hunkInd)
          hunkInd++
          // fileInd++
        } else {
          // this tries to remove a line that can't be found
          // if it's a modification, we also need to remove its replacement
          if (line.type === "remove") {
            let matchingAddLineIndex = 0
            for (let i = hunkInd + 1; i < this.lines.length; i++) {
              if (
                this.lines[i].type === "add" &&
                isSimilar(this.lines[i].content, line.content, 0.9)
              ) {
                matchingAddLineIndex = i
                break
              }
            }

            if (matchingAddLineIndex) {
              const lineToRemove = this.lines[matchingAddLineIndex]
              this.popLine(line, hunkInd--)
              this.popLine(lineToRemove, matchingAddLineIndex - 1)
              if (!foundActionableLine) {
                // this feels wrong
                this.startLinePreEdit += 2
                this.startLinePostEdit += 2
              }
              // hunkInd--
            } else {
              foundActionableLine = true
            }
          }
          hunkInd++
          fileInd++
        }
      } else {
        // These were 90% or better matches
        line.content = linesDict[fileInd]
        hunkInd++
        fileInd++
      }
    }

    return true
  }

  // Helper methods
  private getForwardBlock(
    linesDict: { [key: number]: string },
    startIndex: number
  ): string {
    const forwardLines = []
    for (let i = startIndex; i < startIndex + this.forwardBlockLen; i++) {
      if (linesDict[i]) {
        forwardLines.push(linesDict[i])
      }
    }
    return forwardLines.join("\n")
  }

  private makeForwardBlock(
    startIndex: number,
    length: number = this.forwardBlockLen
  ): string {
    const forwardLines = this.lines
      .slice(startIndex)
      .filter((line) => line.type !== "add")
      .map((line) => line.content)
    return forwardLines.slice(0, length).join("\n")
  }

  private popLine(line: Line, index: number): void {
    this.lines.splice(index, 1)
    if (this.categoryCounts[line.type] > 0) {
      this.categoryCounts[line.type]--
    } else {
      console.warn(`Attempted to decrement count for ${line.type} below zero`)
    }
  }
}

class Diff {
  filenamePre: string
  filenamePost: string
  hunks: Hunk[]

  constructor(filenamePre: string, filenamePost: string) {
    this.filenamePre = filenamePre
    this.filenamePost = filenamePost
    this.hunks = []
  }

  setHunks(hunks: Hunk[]): void {
    this.hunks = hunks
  }

  diffToString(): string {
    let string = `--- ${this.filenamePre}\n+++ ${this.filenamePost}\n`
    for (const hunk of this.hunks) {
      string += hunk.hunkToString()
    }
    return string.trim()
  }

  validateAndCorrect(linesDict: { [key: number]: string }): string[] {
    const problems: string[] = []
    for (const hunk of this.hunks) {
      const { isValid, message } = hunk.validateAndCorrect(linesDict)
      if (!isValid) {
        problems.push(
          `Invalid hunk: ${hunk.hunkToString()}\nReason: ${message}`
        )
      }

      // remove hunk if it's a noop
      if (hunk.categoryCounts.remove + hunk.categoryCounts.add === 0) {
        this.hunks.splice(this.hunks.indexOf(hunk), 1)
      }

      hunk.hunkLenPreEdit =
        hunk.categoryCounts.retain + hunk.categoryCounts.remove
      hunk.hunkLenPostEdit =
        hunk.categoryCounts.retain + hunk.categoryCounts.add
    }
    return problems
  }
}

function isSimilar(
  str1: string | undefined,
  str2: string | undefined,
  similarityThreshold: number = 0.9 // Lowered threshold
): boolean {
  if (str1 === undefined || str2 === undefined) {
    return false
  }
  const ratio = weightedStringSimilarity(str1, str2)
  return ratio >= similarityThreshold && ratio <= 1
}

function weightedStringSimilarity(str1: string, str2: string): number {
  const wordWeight = 3
  const numberWeight = 1
  const symbolWeight = 0.1

  function charWeight(char: string): number {
    if (/[a-zA-Z]/.test(char)) return wordWeight
    // include numbers and decimals in the number weight
    if (/[\d.]/.test(char)) return numberWeight
    return symbolWeight
  }

  function levenshtein(a: string, b: string): number {
    const lenA = a.length
    const lenB = b.length
    const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
      Array(lenB + 1).fill(0)
    )

    for (let i = 0; i <= lenA; i++) dp[i][0] = i
    for (let j = 0; j <= lenB; j++) dp[0][j] = j

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost =
          a[i - 1] === b[j - 1]
            ? 0
            : charWeight(a[i - 1]) + charWeight(b[j - 1])
        dp[i][j] = Math.min(
          dp[i - 1][j] + charWeight(a[i - 1]), // Deletion
          dp[i][j - 1] + charWeight(b[j - 1]), // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        )
      }
    }

    return dp[lenA][lenB]
  }

  const distance = levenshtein(str1, str2)
  const maxWeight = Math.max(str1.length * wordWeight, str2.length * wordWeight)
  return maxWeight === 0 ? 1 : 1 - distance / maxWeight
}

function parseDiff(diffText: string): Diff {
  const lines = diffText.split("\n")
  let preIndex = 0
  let filenamePre = ""
  let filenamePost = ""

  // Find the file names
  for (const line of lines) {
    preIndex++
    if (line.startsWith("--- a/")) {
      filenamePre = line.slice(6).replace(".tmp", "")
    } else if (line.startsWith("+++ b/")) {
      filenamePost = line.slice(6).replace(".tmp", "")
      break
    }
  }

  // // Remove the first preIndex lines
  // lines.splice(0, preIndex)

  if (!filenamePre || !filenamePost) {
    throw new Error("Could not find file names in diff")
  }

  const diff = new Diff(filenamePre, filenamePost)

  let currentHunk: Hunk | null = null
  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (currentHunk) {
        diff.hunks.push(currentHunk)
      }
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
      if (match) {
        const [
          ,
          startLinePreEdit,
          hunkLenPreEdit = "1",
          startLinePostEdit,
          hunkLenPostEdit = "1",
        ] = match
        currentHunk = new Hunk(
          Number(startLinePreEdit),
          Number(hunkLenPreEdit),
          Number(startLinePostEdit),
          Number(hunkLenPostEdit),
          []
        )
      } else {
        console.error("Failed to parse hunk header:", line)
        continue
      }
    } else if (currentHunk) {
      const type: LineType = line.startsWith("+")
        ? "add"
        : line.startsWith("-")
        ? "remove"
        : "retain"

      const content = line.slice(1)
      currentHunk.addLines([{ type, content }])
    }
  }
  if (currentHunk) {
    diff.hunks.push(currentHunk)
  }
  return diff
}

export function correctPatch(
  patchText: string,
  targetFileContent: string
): string {
  const linesDict = targetFileContent.split("\n").reduce((acc, line, index) => {
    acc[index + 1] = line
    return acc
  }, {} as { [key: number]: string })

  const diff = parseDiff(patchText)
  // Reorder hunks
  diff.hunks.sort((a, b) => a.startLinePreEdit - b.startLinePreEdit)

  diff.hunks = diff.hunks.flatMap((hunk) => {
    const rootHunk = new Hunk(
      hunk.startLinePreEdit,
      hunk.hunkLenPreEdit,
      hunk.startLinePostEdit,
      hunk.hunkLenPostEdit,
      []
    )
    const extraHunks: Array<typeof rootHunk> = []

    let i = 0
    while (i < hunk.lines.length) {
      if (hunk.lines[i]?.type === "retain" || hunk.lines[i]?.type === "add") {
        let foundActionableLine = false
        let batchStartIndex = i
        let batch = []
        let batchedRetains = 0
        let batchedAdds = 0
        for (; i < hunk.lines.length; i++) {
          if (hunk.lines[i].type === "remove") {
            break
          }

          if (hunk.lines[i].type === "add") {
            foundActionableLine = true
            batchedAdds++
          } else {
            batchedRetains++
          }
          batch.push(hunk.lines[i])
        }
        if (batch.length > 0 && foundActionableLine) {
          const newHunk = new Hunk(
            hunk.startLinePreEdit + batchStartIndex,
            batchedRetains,
            hunk.startLinePostEdit + batchStartIndex,
            batchedAdds + batchedRetains,
            []
          )
          newHunk.addLines(batch)
          extraHunks.push(newHunk)
        }
      }

      if (hunk.lines[i]?.type === "remove") {
        let batchStartIndex = i
        let batch = []
        let batchedRemoves = 0
        let batchedAdds = 0
        for (; i < hunk.lines.length; i++) {
          if (hunk.lines[i].type === "retain") {
            break
          }
          if (hunk.lines[i].type === "remove") {
            batchedRemoves++
          } else {
            batchedAdds++
          }
          batch.push(hunk.lines[i])
        }
        if (batch.length > 0) {
          const newHunk = new Hunk(
            hunk.startLinePreEdit + batchStartIndex,
            batchedRemoves,
            hunk.startLinePostEdit + batchStartIndex,
            batchedAdds,
            []
          )
          newHunk.addLines(batch)
          extraHunks.push(newHunk)
        }
      }

      // if (!excludedLinesIndexes.includes(i) && hunk.lines[i]) {
      // 	rootHunk.addLines([hunk.lines[i]])
      // }
      i++
    }

    return rootHunk.lines.length > 0 ? [rootHunk, ...extraHunks] : extraHunks
  })

  // BUG SOLVED: must match lines when the first lines of the hunk aren't present in the file
  // Adjust hunk line numbers if necessary
  for (const hunk of diff.hunks) {
    let foundMatch = false
    let candidates = []
    // TODO: this probably wont'work if the first line of the diff can't match
    for (let lineNumber = 0; lineNumber < hunk.lines.length; lineNumber++) {
      for (let index = 0; index <= Object.keys(linesDict).length * 2; index++) {
        const i = index % 2 === 0 ? index / 2 : -(Math.floor(index / 2) + 1)
        const adjustedStartLine = hunk.startLinePreEdit + i
        if (adjustedStartLine < 0) continue
        if (!linesDict[adjustedStartLine]) {
          continue
        }

        const similarity = weightedStringSimilarity(
          hunk.lines[lineNumber].content,
          linesDict[adjustedStartLine]
        )

        if (similarity === 1) {
          hunk.startLinePreEdit = adjustedStartLine
          hunk.startLinePostEdit += i
          foundMatch = true
          break
        }

        if (similarity >= 0.9) {
          foundMatch = true

          candidates.push({
            index: i,
            similarity,
          })
        } else {
          if (candidates.length === 0) {
          }
        }
      }

      if (candidates.length > 0) {
        foundMatch = true

        candidates.sort((a, b) => b.similarity - a.similarity)
        hunk.startLinePreEdit += candidates[0].index - lineNumber
        hunk.startLinePostEdit += candidates[0].index - lineNumber
      }

      if (foundMatch) break
    }

    if (!foundMatch) {
      console.warn(
        `Could not find a matching line for hunk starting at line ${hunk.startLinePreEdit}`
      )
    }
  }

  const problems = diff.validateAndCorrect(linesDict)
  if (problems.length > 0) {
    console.error("Validation failed with problems:")
    problems.forEach((problem, index) => {
      console.error(`Problem ${index + 1}:\n${problem}\n`)
    })
    return ""
  }
  return diff.diffToString().trim() + "\n"
}
