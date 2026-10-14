import { exec } from '@actions/exec';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';

const MIN_VERSION = '3.50.0';
const MAX_THEME_VERSION = '3.59.0';

/**
 * Installs the Shopify CLI in an isolated directory outside of the
 * repository so that the repository's package manager (npm, yarn,
 * pnpm, bun...), lockfile and node_modules are never involved.
 *
 * Returns the path to the shopify executable.
 */
export async function installCli(version?: string) {
  const versionSuffix = version ? `@${version}` : '';

  if (!isValidVersion(version)) {
    throw new Error(
      `Shopify CLI version: ${version} is invalid or smaller than ${MIN_VERSION}`,
    );
  }

  const installDir = path.join(
    process.env.RUNNER_TEMP || os.tmpdir(),
    'theme-check-action-cli',
  );

  // The package.json anchors npm to installDir so that it never walks
  // up into a parent project.
  fs.mkdirSync(installDir, { recursive: true });
  fs.writeFileSync(
    path.join(installDir, 'package.json'),
    JSON.stringify({ private: true }),
  );

  await exec(
    'npm',
    [
      'install',
      '--prefix',
      installDir,
      '--no-package-lock',
      '--no-save',
      `@shopify/cli${versionSuffix}`,
      shouldIncludeTheme(version)
        ? `@shopify/theme${versionSuffix}`
        : '',
    ].filter(Boolean),
  );

  return path.join(installDir, 'node_modules', '.bin', 'shopify');
}

function shouldIncludeTheme(version?: string) {
  if (!version || version.includes('experimental')) {
    return false;
  }

  if (!semver.valid(version)) {
    return false;
  }

  if (
    semver.gte(version, MIN_VERSION) &&
    semver.lt(version, MAX_THEME_VERSION)
  ) {
    return true;
  }

  return false;
}

function isValidVersion(version?: string): boolean {
  if (!version || version.includes('experimental')) {
    return true;
  }

  // Check if the version is valid
  if (!semver.valid(version)) {
    return false;
  }

  // Check if the version is greater than or equal to the minimum version
  if (!semver.gte(version, MIN_VERSION)) {
    return false;
  }

  return true;
}
