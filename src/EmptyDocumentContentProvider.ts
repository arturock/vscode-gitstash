'use strict'

import * as vscode from 'vscode'

export class EmptyDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>()

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEmitter.event
    }

    provideTextDocumentContent(): vscode.ProviderResult<string> {
        return ''
    }
}
