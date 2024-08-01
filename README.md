# update-epic-stack

The idea here is to make it as easy as possible to update your project to the latest version of the epic stack.

> This tool is still under heavy development. Use with care

Future plans:

- Some commits are eventually reverted, those should be detected, paired, and skipped. I'm not opposed to maintaining a hardcoded index of decisions for each commit in this codebase, but automatic would be ideal.
- If a file is modified, but later gets deleted, it's annoying for the user deal with needless merge conflicts. We could either skip the patch entirely, or wait until a merge conflict comes up and then let the user know they'll probably want to skip this one

## update-epic-stack pull

- Clones the latest epic stack to node_modules/@epic-web/epic-stack
- Looks at every commit since the `"epic-stack.hash"` in `package.json` or `--hash` flag
  - Looks at each file changed in the commit
    - If it's a modification to a file that you don't have, it's skipped
    - If it affects a small default ignore list, it's skipped
    - If it affects a file that you passed in --ignore, it's skipped
    - Otherwise, it creates a **corrected patch file**
  - Then it creates a patch file to update the "epic-stack.hash"
- All patches are written to `patches/` in your project

## update-epic-stack apply

- Reads all the `patches/` in your project
- Applies the patches in order
- If a patch can't be applied, it pauses to allow you to fix it manually, then press enter to continue
- Also pauses for confirmation at the end of each commit, which is always the patch to update the "epic-stack.hash". This lets you stop at any point and resume from the same place.

## Corrected patch files

Since you will have made many changes to the project since originally forking from the epic stack, it's unlikely that a direct `git diff` will apply cleanly.

Instead, this tool first creates a raw patch file, then corrects it for your codebase.

- Each change in the patch searches for the matching line in your codebase to update its line number
- Changes to lines that don't exist in your codebase are ignored, such as package.json updates for dependencies you have removed

Extra context is minimized to avoid conflicts

- If there is a removal, the lines around it are not included
- Added lines require context to know where to insert them, so the lines around them are included

## Find your first commit

In order to know what changes to pull, this tool needs to know where to start.

If you know how old your project is, you can look through https://github.com/epicweb-dev/epic-stack/commits/main/ to find the last commit before your project diverged from the epic stack.

Then, set the `"epic-stack.head"` in your package.json to that commit hash.

```diff
- "epic-stack": true,
+ "epic-stack": {
+   "head": "fe5d18af4501f00c0580e885a90ce12abf8e2fe7"
+ }
```

Alternatively, you can pass the `npx update-epic-stack pull --hash fe5d18af4501f00c0580e885a90ce12abf8e2fe7` flag

## Goals
