import * as core from '@actions/core';
import * as github from '@actions/github';
import { wait } from './wait';

const OUTPUT_HAS_UPDATED = 'has-updated';
const OUTPUT_VERSION = 'version';

async function getPackageJson(
  ref: string,
  octokit: ReturnType<typeof github.getOctokit>,
): Promise<{ version: string }> {
  const data = (
    await octokit.rest.repos.getContent({
      ...github.context.repo,
      path: process.env['INPUT_PATH'] || 'package.json',
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
    const ms: string = core.getInput('milliseconds');
    // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    core.debug(`Waiting ${ms} milliseconds ...`);

    core.debug(new Date().toTimeString());
    await wait(parseInt(ms, 10));
    core.debug(new Date().toTimeString());

    const GITHUB_TOKEN =
      core.getInput('GITHUB_TOKEN') || process.env.GITHUB_TOKEN;

    if (typeof GITHUB_TOKEN !== 'string') {
      throw new Error(
        'Invalid GITHUB_TOKEN: did you forget to set it in your action config?',
      );
    }

    const octokit = github.getOctokit(GITHUB_TOKEN);

    const currentRef = github.context.sha;
    const previousRef = (
      (
        await octokit.rest.repos.getCommit({
          ...github.context.repo,
          ref: currentRef,
        })
      ).data.parents[0] || {}
    ).sha;

    const currentPackageJSON = await getPackageJson(currentRef, octokit);
    core.setOutput(OUTPUT_VERSION, currentPackageJSON.version);

    if (!previousRef) {
      core.setOutput(OUTPUT_HAS_UPDATED, true);
      return;
    }

    const previousPackageJSON = await getPackageJson(previousRef, octokit);
    core.setOutput(
      OUTPUT_HAS_UPDATED,
      currentPackageJSON.version !== previousPackageJSON.version,
    );

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
