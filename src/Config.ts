'use strict'

import { WorkspaceConfiguration, workspace } from 'vscode'

export default class {
    public settings: WorkspaceConfiguration

    constructor() {
        this.reload()
    }

    /**
     * Loads the plugin config.
     */
    public reload(): void {
        this.settings = workspace.getConfiguration('gitstash')
    }

    public get<T>(section: string, defaultValue?: T): T {
        return this.settings.get(section, defaultValue)
    }
}
