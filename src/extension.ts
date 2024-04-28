// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { join as pathJoin } from 'path-browserify';
import getLatestVersion from 'get-latest-version';
import NpmTreeDataProvider from './treeDataProvider';
import { installDependency } from './installer';

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vscode-extension-test" is now active!'
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-extension-test.helloWorld', () => {
      vscode.window.showInformationMessage(
        'Hello World from vscode-extension-test!'
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-extension-test.installDependency',
      installDependency
    )
  );

  getLatestVersion('create-vite').then((version) => {
    vscode.window.showInformationMessage(
      `Latest version of vite is ${version}`
    );
  });

  const npmDataProvider = new NpmTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider<TreeChild>('packages-explorer', {
      getTreeItem: (element) => {
        if (element.type === 'dependency') {
          return new Dependency(
            element.name,
            vscode.TreeItemCollapsibleState.None,
            element.version,
            true
          );
        }

        if (element.type === 'dependency-dropdown') {
          return {
            label: 'Dependencies',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            contextValue: 'dependencyDropdown',
          };
        }

        if (element.type === 'devDependency-dropdown') {
          return {
            label: 'DevDependencies',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            contextValue: 'devDependencyDropdown',
          };
        }

        throw new TypeError(
          'Unknown element provided to package explorer tree'
        );
      },
      getChildren: async (element): Promise<TreeChild[]> => {
        if (!element) {
          if (vscode.workspace.workspaceFolders) {
            return [
              { type: 'dependency-dropdown' },
              { type: 'devDependency-dropdown' },
            ];
          }
        }

        if (element) {
          if (
            element.type === 'dependency' ||
            element.type == 'dependency-input'
          )
            return [];
          if (
            element.type === 'dependency-dropdown' ||
            element.type === 'devDependency-dropdown'
          ) {
            const workspaceUri = vscode.workspace.workspaceFolders?.[0].uri;
            if (!workspaceUri) {
              return [];
            }

            try {
              const packageJson = JSON.parse(
                new TextDecoder().decode(
                  await vscode.workspace.fs.readFile(
                    vscode.Uri.joinPath(workspaceUri, 'package.json')
                  )
                )
              );

              if (typeof packageJson !== 'object')
                throw new DependencyError('Package json is not an object');

              const result: TreeChild[] = [];

              if (element.type == 'dependency-dropdown') {
                const dependencies = packageJson.dependencies || {};
                for (const [name, version] of Object.entries(dependencies)) {
                  if (typeof version !== 'string')
                    throw new DependencyError(
                      `Version of ${name} is not a string`
                    );

                  result.push({ type: 'dependency', name, version });
                }
              }

              if (element.type == 'devDependency-dropdown') {
                const dependencies = packageJson.devDependencies || {};
                for (const [name, version] of Object.entries(dependencies)) {
                  if (typeof version !== 'string')
                    throw new DependencyError(
                      `Version of ${name} is not a string`
                    );

                  result.push({ type: 'dependency', name, version });
                }
              }

              return result;
            } catch (e) {
              if (e instanceof DependencyError)
                vscode.window.showErrorMessage(e.toString());
              return [];
            }
          }
        }
        return [];
      },
    })
  );
}

class DependencyError extends Error {
  name = 'DependencyError';
}

type TreeChild =
  | DependencyChild
  | DependencyDropdown
  | DevDependencyDropdown
  | DependencyInput;

interface DependencyChild {
  type: 'dependency';
  name: string;
  version: string;
}

interface DependencyDropdown {
  type: 'dependency-dropdown';
}

interface DevDependencyDropdown {
  type: 'devDependency-dropdown';
}

interface DependencyInput {
  type: 'dependency-input';
  dependencyType: 'main' | 'dev';
}

class Dependency extends vscode.TreeItem {
  constructor(
    public label: string,
    public collapsibleState?: vscode.TreeItemCollapsibleState,
    public version?: string,
    link: boolean = false
  ) {
    super(label, collapsibleState);
    this.description = version || '*';

    if (link) {
      this.command = {
        command: 'vscode.open',
        title: 'Open in NPM',
        arguments: [`https://npmjs.com/package/${this.label}`],
      };
    }

    this.tooltip = this.version;
  }

  contextValue = 'dependency';
  iconPath = vscode.ThemeIcon.Folder;
}

// This method is called when your extension is deactivated
export function deactivate() {}
