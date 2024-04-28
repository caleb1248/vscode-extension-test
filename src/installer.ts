import getLatestVersion from 'get-latest-version';
import * as vscode from 'vscode';
import * as path from 'path-browserify';

const installDependency = async (dependencyName?: string, version?: string) => {
  const depName =
    dependencyName ||
    (await vscode.window.showInputBox({
      placeHolder: 'Dependency name',
      prompt: 'Enter dependency name',
      ignoreFocusOut: true,
    }));

  if (!depName) return;

  let depVersion =
    version ||
    (await vscode.window.showInputBox({
      placeHolder: 'Dependency version',
      prompt: 'Enter dependency version',
    }));
  vscode.window.showInformationMessage(
    `Installing ${depName} with version ${depVersion}`
  );

  if (!depVersion === undefined) return;

  if (depVersion === '') depVersion = '*';

  const latestVersion = getLatestVersion(depName, depVersion);

  vscode.window.showInformationMessage(`Installing ${depName}@${depVersion}`);

  const fetchedPackage = await fetch(
    'https://registry.npmjs.org/' + depName + '/' + depVersion
  );

  const packageJson = await fetchedPackage.json();
  if (typeof packageJson !== 'object' || packageJson === null)
    throw new Error(
      `Expected package  to be an object but got '${packageJson}`
    );

  if (
    'dist' in packageJson === false ||
    typeof packageJson.dist !== 'object' ||
    packageJson.dist === null ||
    'tarball' in packageJson.dist === false ||
    typeof packageJson.dist.tarball !== 'string'
  ) {
    vscode.window.showErrorMessage('No tarball found');
    return;
  }
  const tgzUrl = packageJson.dist?.tarball;
};

export { installDependency, installDependency as default };
