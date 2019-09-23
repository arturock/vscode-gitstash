'use strict';

import {
    commands,
    Event,
    EventEmitter,
    ThemeIcon,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Uri
} from 'vscode';
import { join } from 'path';
import Config from './Config';
import Model from './Model';
import StashLabels from './StashLabels';
import StashNode, { NodeType } from './StashNode';

export default class GitStashTreeDataProvider implements TreeDataProvider<StashNode> {
    private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
    readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;

    private config: Config;
    private stashLabels: StashLabels;
    private model: Model;
    private rawStashes = {};
    private loadTimeout: NodeJS.Timer;
    private showExplorer: boolean;

    constructor(config: Config, model: Model, stashLabels: StashLabels) {
        this.config = config;
        this.model = model;
        this.stashLabels = stashLabels;
    }

    /**
     * Reloads the explorer tree.
     */
    public refresh = () => {
        this.reload('force');
    }

    /**
     * Toggles the explorer tree.
     */
    public toggle = () => {
        this.showExplorer = typeof this.showExplorer === 'undefined'
            ? this.config.settings.explorer.enabled
            : !this.showExplorer;

        commands.executeCommand(
            'setContext',
            'gitstash.explorer.enabled',
            this.showExplorer
        );
    }

    /**
     * Gets the tree children, which may be repositories, stashes or files.
     *
     * @param node the parent node for the requested children
     */
    public getChildren(node?: StashNode): Thenable<StashNode[]> {
        if (!node) {
            return this.model.getRepositories();
        }

        return node.type === NodeType.Repository
            ? this.model.getStashes(node)
            : this.model.getFiles(node);
    }

    /**
     * Generates a tree item for the specified node.
     *
     * @param node The node to be used as base
     */
    public getTreeItem(node: StashNode): TreeItem {
        switch (node.type) {
            case NodeType.Repository: return this.getRepositoryItem(node);
            case NodeType.Stash:      return this.getStashItem(node);
            default:                  return this.getFileItem(node);
        }
    }

    /**
     * Reloads the git stash tree view.
     *
     * @param type        the event type: settings, force, create, update, delete
     * @param projectPath the URI of the project with content changes
     */
    public reload(type: string, projectPath?: Uri): void {
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
        }

        this.loadTimeout = setTimeout((type: string, pathUri?: Uri) => {
            if (['settings', 'force'].indexOf(type) !== -1) {
                this._onDidChangeTreeData.fire();
            }
            else {
                const path = pathUri.fsPath;

                this.model.getRawStashesList(path).then((rawStash: string) => {
                    const cachedRawStash = this.rawStashes[path];

                    if (!cachedRawStash || cachedRawStash !== rawStash) {
                        this.rawStashes[path] = rawStash;
                        this._onDidChangeTreeData.fire();
                    }
                });
            }
        }, type === 'force' ? 250 : 750, type, projectPath);
    }

    /**
     * Generates an repository tree item.
     *
     * @param node The node to be used as base
     */
    private getRepositoryItem(node: StashNode): TreeItem {
        return {
            label: this.stashLabels.getName(node),
            tooltip: this.stashLabels.getTooltip(node),
            iconPath: this.getIcon('repository.svg'),
            contextValue: 'repository',
            collapsibleState: TreeItemCollapsibleState.Collapsed,
            command: void 0
        };
    }

    /**
     * Generates an stash tree item.
     *
     * @param node The node to be used as base
     */
    private getStashItem(node: StashNode): TreeItem {
        return {
            label: this.stashLabels.getName(node),
            tooltip: this.stashLabels.getTooltip(node),
            iconPath: this.getIcon('chest.svg'),
            contextValue: 'stash',
            collapsibleState: TreeItemCollapsibleState.Collapsed,
            command: void 0
        };
    }

    /**
     * Generates a stashed file tree item.
     *
     * @param node The node to be used as base
     */
    private getFileItem(node: StashNode): TreeItem {
        let context = 'file';
        switch (node.type) {
            case (NodeType.Deleted): context += ':deleted'; break;
            case (NodeType.IndexAdded): context += ':indexAdded'; break;
            case (NodeType.Modified): context += ':modified'; break;
            case (NodeType.Renamed): context += ':renamed'; break;
            case (NodeType.Untracked): context += ':untracked'; break;
        }

        return {
            label: this.stashLabels.getName(node),
            tooltip: this.stashLabels.getTooltip(node),
            iconPath: this.getFileIcon(node.type),
            contextValue: context,
            collapsibleState: void 0,
            command: {
                title: 'Show stash diff',
                command: 'gitstash.show',
                arguments: [node]
            }
        };
    }

    /**
     * Builds an icon path.
     *
     * @param filename The filename of the icon
     */
    private getIcon(filename: string): { light: string; dark: string } {
        return {
            light: join(__dirname, '..', 'resources', 'icons', 'light', filename),
            dark: join(__dirname, '..', 'resources', 'icons', 'dark', filename)
        };
    }

    /**
     * Builds a file icon path.
     *
     * @param filename The filename of the icon
     */
    private getFileIcon(type: NodeType): { light: string; dark: string } | ThemeIcon {
        switch (type) {
            case NodeType.Deleted: return this.getIcon('status-deleted.svg');
            case NodeType.IndexAdded: return this.getIcon('status-added.svg');
            case NodeType.Modified: return this.getIcon('status-modified.svg');
            case NodeType.Renamed: return this.getIcon('status-renamed.svg');
            case NodeType.Untracked: return this.getIcon('status-untracked.svg');
            default: return ThemeIcon.File;
        }
    }
}
