import * as core from '@actions/core';
import * as github from '@actions/github';

const OUTPUT_HAS_UPDATED = 'has-updated';
const OUTPUT_VERSION = 'version';
const OUTPUT_PREVIOUS_VERSION = 'previous-version';

async function getPackageJson(
  path = 'package.json',
  ref: string,
  octokit: ReturnType<typeof github.getOctokit>,
): Promise<{ version: string }> {
  const data = (
    await octokit.rest.repos.getContent({
      ...github.context.repo,
      path,
      ref,
    })
  ).data as { content: string };

  const packageJSONData = data.content;

  if (!packageJSONData) {
    throw new Error(`Could not find package.json for commit ${ref}`);
  }

  return JSON.parse(Buffer.from(packageJSONData, 'base64').toString());
}

async function run(): Promise<void> {
  try {
    /**
     * Get Workflow Input
     */
    const GITHUB_TOKEN =
      core.getInput('GITHUB_TOKEN') || process.env.GITHUB_TOKEN;
    const PACKAGE_JSON_PATH =
      core.getInput('PACKAGE_JSON_PATH') || process.env.PACKAGE_JSON_PATH;

    if (typeof GITHUB_TOKEN !== 'string') {
      throw new Error(
        'Invalid GITHUB_TOKEN: did you forget to set it in your action config?',
      );
    }

    const octokit = github.getOctokit(GITHUB_TOKEN);

    /**
     * Get current & previous commits
     */
    const currentRef = github.context.sha;
    const previousRef = (
      (
        await octokit.rest.repos.getCommit({
          ...github.context.repo,
          ref: currentRef,
        })
      ).data.parents[0] || {}
    ).sha;

    /**
     * Read current package.json
     */
    const currentPackageJSON = await getPackageJson(
      PACKAGE_JSON_PATH,
      currentRef,
      octokit,
    );
    core.setOutput(OUTPUT_VERSION, currentPackageJSON.version);

    if (!previousRef) {
      core.setOutput(OUTPUT_HAS_UPDATED, true);
      return;
    }

    /**
     * Read previous package.json
     */
    const previousPackageJSON = await getPackageJson(
      PACKAGE_JSON_PATH,
      previousRef,
      octokit,
    );
    core.setOutput(
      OUTPUT_HAS_UPDATED,
      currentPackageJSON.version !== previousPackageJSON.version,
    );
    core.setOutput(OUTPUT_PREVIOUS_VERSION, previousPackageJSON.version);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
