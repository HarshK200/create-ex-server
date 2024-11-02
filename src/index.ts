import prompts from "prompts";
import fs from "node:fs";
import colors from "picocolors";
import path from "node:path";

// ************************* Helper functions *************************
function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, "");
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

function emptyExistingDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  // the for .. of loop returns only the values (not index) of the array
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

function getProjectName(targetDir: string): string {
  return targetDir === "." ? path.basename(path.resolve()) : targetDir;
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName,
  );
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-");
}

// ************************* Helper functions *************************

const { red } = colors;
const defaultTargetDir = "express-project";

async function init() {
  const argTargetDir = formatTargetDir(process.argv.slice(2)[0]);
  let targetDir = argTargetDir || defaultTargetDir;

  let result: prompts.Answers<"projectName" | "overwrite" | "packageName">;

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : "text",
          name: "projectName",
          message: "Project Name:",
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir;
          },
        },

        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : "select",
          name: "overwrite",
          message: () =>
            (targetDir === "."
              ? "Current directory "
              : `Target directory "${targetDir}"`) +
            `is not empty please choose how to proceed`,
          initial: 0,
          choices: [
            {
              title: "Remove existing files and continue",
              value: "yes",
            },
            {
              title: "Cancel operation",
              value: "no",
            },
            {
              title: "Ignore files and continue",
              value: "ignore",
            },
          ],
        },

        {
          type: (_, { overwrite }: { overwrite?: string }) => {
            if (overwrite === "no") {
              throw new Error(red("✖") + " Operation cancelled");
            }
            return null;
          },
          name: "overwriteChecker",
        },

        {
          type: () =>
            isValidPackageName(getProjectName(targetDir)) ? null : "text",
          name: "packageName",
          message: "Package Name:",
          initial: () => toValidPackageName(getProjectName(targetDir)),
          validate: (dir) =>
            isValidPackageName(dir) || "Invalid package.json name",
        },
      ],

      {
        onCancel: () => {
          throw new Error(red("✖") + " Operation cancelled");
        },
      },
    );
  } catch (e: any) {
    console.log(e.message);
    return;
  } finally {
    console.log(result!);
    console.log(import.meta.url);
  }

  // user's choice from the prompt
  // @ts-ignore
  const { projectname, overwrite } = result;

  // root where the new project will be created
  const root = path.join(process.cwd(), targetDir);

  if (overwrite === "yes") {
    emptyExistingDir(root);
  }
}

init().catch((e) => {
  console.error(e);
});
