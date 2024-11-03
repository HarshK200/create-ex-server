import prompts from "prompts";
import fs from "node:fs";
import colors from "picocolors";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

//@ts-ignore
function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-");
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

// copy(src, dist) copys the file/directory from the src path to the dest path
function copy(src: string, dest: string) {
  const fileStats = fs.statSync(src);
  if (fileStats.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

// ************************* Helper functions *************************

// **************************** Constants/enums ****************************

const { red, greenBright, yellow } = colors;
const defaultTargetDir = "express-project";

enum Template {
  Express_Nodewatch = "express-nodewatch",
  Express_Nodewatch_Cors = "express-nodewatch-cors",
  Express_Nodemon = "express-nodemon",
  Express_Nodemon_Cors = "express-nodemon-cors",
}

// **************************** Constants/enums ****************************

async function init() {
  const argTargetDir = formatTargetDir(process.argv.slice(2)[0]);
  let targetDir = argTargetDir || defaultTargetDir;

  let result: prompts.Answers<
    "projectName" | "overwrite" | "packageName" | "hotReloading" | "enableCors"
  >;

  try {
    console.log("Welcome to express.js project starter 🚅");
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

        // checking to overwrite file since prjectname overlaps with a existing directory
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

        // if the project name is invalid then we'll create the directory with the projectname but the package.json will have a different name i.e. package name
        {
          type: () =>
            isValidPackageName(getProjectName(targetDir)) ? null : "text",
          name: "packageName",
          message: "Package Name:",
          initial: getProjectName(targetDir),
          validate: (dir) =>
            isValidPackageName(dir) || "Invalid package.json name",
        },

        {
          type: "select",
          name: "hotReloading",
          message: "Pick what to use server auto-restart on change",
          choices: [
            { title: `${greenBright("Nodemon")}`, value: "nodemon" },
            {
              title: `${yellow("Node --watch flag (experimental)")}`,
              value: "nodewatch",
            },
            { title: `${red("none")}`, value: "none" },
          ],
        },

        {
          type: "toggle",
          name: "enableCors",
          message: "Enable cors?",
          initial: true,
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
  }

  // user's choice from the prompt
  // prettier-ignore
  // @ts-ignore
  const { projectname, overwrite, packageName, hotReloading, enableCors } = result;

  // NOTE: root of the new project will be created
  const root = path.join(process.cwd(), targetDir);

  if (overwrite === "yes") {
    emptyExistingDir(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true }); // NOTE: when using { recursive: true } option if the path to currentDir is provided the function silently does nothin'
  }

  // determine template (default express-base)
  let template: Template = Template.Express_Nodewatch;
  // NOTE: even for none notewatch template is selected (since the only difference is the package.json run script that is overwritten later)
  if (hotReloading === "nodewatch" || hotReloading === "none") {
    if (enableCors) {
      template = Template.Express_Nodewatch_Cors;
    }
  } else if (hotReloading === "nodemon") {
    if (enableCors) {
      template = Template.Express_Nodemon_Cors;
    } else {
      template = Template.Express_Nodemon;
    }
  }

  // doing ../.. (because the path considers index.mjs file as a directory) for e.g. create-express-starter/dist/index.mjs note /index.mjs
  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    "../..",
    `template-${template}`,
  );

  // looping thorugh the template dir and copying the files to new-project dir
  const files = fs.readdirSync(templateDir);
  for (const file of files) {
    if (file === "package.json") {
      continue;
    }
    copy(path.join(templateDir, file), path.join(root, file));
  }

  const pkgJSON = JSON.parse(
    fs.readFileSync(path.join(templateDir, "package.json"), {
      encoding: "utf8",
    }),
  );
  pkgJSON.name = packageName || getProjectName(targetDir);
  if (hotReloading === "none") {
    pkgJSON.scripts.dev = "node index.js";
  }

  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(pkgJSON, null, 2), // the third argument 2 is for indent/spacing
  );

  const cdProjectName = path.relative(process.cwd(), root);
  console.log("\nFinished setting up your express project 🚀. Now run:");
  if (process.cwd() !== root) {
    console.log(
      `  cd ${cdProjectName.includes(" ") ? `"${cdProjectName}"` : cdProjectName}`,
    );
  }
  console.log("  npm install");
  console.log("  npm run dev");
}

init().catch((e) => {
  console.error(e);
});
