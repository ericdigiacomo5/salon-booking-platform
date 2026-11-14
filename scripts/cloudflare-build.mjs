import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"
import path from "node:path"

const deploying = process.argv.includes("--deploy")

function run(args, env = process.env) {
    const result = spawnSync("npx", args, { stdio: "inherit", shell: true, env })
    if (result.status !== 0) process.exit(result.status ?? 1)
}

run(["opennextjs-cloudflare", "build"], { ...process.env, BUILD_TARGET: "cloudflare" })

if (deploying) {
    const bundledEnvFile = path.resolve(".open-next", "cloudflare", "next-env.mjs")
    const bundled = await import(pathToFileURL(bundledEnvFile).href)
    const names = [...new Set(Object.values(bundled).flatMap((vars) => Object.keys(vars)))]
    if (names.length > 0) {
        console.error(
            `\nNot deploying: this build contains values from local .env files (${names.join(", ")}).\n` +
                "Deploy from a folder with no .env files (a fresh clone of the repo), with the\n" +
                "build-time variables set in the shell. See docs/DEPLOY_RUNBOOK.md.\n",
        )
        process.exit(1)
    }
    run(["opennextjs-cloudflare", "deploy"])
}
