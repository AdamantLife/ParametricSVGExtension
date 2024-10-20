// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let currentPanel: vscode.WebviewPanel | undefined = undefined;
	let currentDoc: vscode.TextEditor | undefined = undefined;
	let lastPath: vscode.Uri | undefined = undefined;

	const preview = ()=>{
		return vscode.commands.registerCommand('parametricsvgextension.preview', ()=> {
			if(currentPanel){
				currentPanel.reveal();
				if(currentDoc) update({document: currentDoc.document, contentChanges: [], reason: undefined});
				return;
			}

			if(!vscode.window.activeTextEditor) return;

			currentDoc = vscode.window.activeTextEditor;
			if(!currentDoc) throw new Error("Failed to retrieve current doc");

			let fname = /\\([^\\]+?)$/.exec(currentDoc.document.fileName)?.[1];

			currentPanel = vscode.window.createWebviewPanel(
				"psvgpreview",
				`PSVG Preview ${fname}`,
				vscode.ViewColumn.Two,
				{  // Options
					enableScripts: true,
					localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "js"), vscode.Uri.joinPath(context.extensionUri, "css")]
				}
			);

			
			let scriptjsuri = vscode.Uri.joinPath(context.extensionUri,  "js", "script.js");
			let scriptjs = currentPanel.webview.asWebviewUri(scriptjsuri);
			let stylecssuri = vscode.Uri.joinPath(context.extensionUri,  "css", "style.css");
			let stylecss = currentPanel.webview.asWebviewUri(stylecssuri);
			
			currentPanel.webview.html = buildPage({script: scriptjs, css: stylecss, webview : currentPanel.webview});

			vscode.workspace.onDidChangeTextDocument(update);

			currentPanel.webview.onDidReceiveMessage(
				(message: {action: "update"|"error"|"save"; message: string|undefined}) => {
					if(["update", "error", "save"].indexOf(message.action) < 0) return;
					if(!currentDoc){
						return vscode.window.showErrorMessage(`PSVGExt received an update message but no current text editor.`);
					}
					if(message.action == "update") return update({document: currentDoc.document, contentChanges: [], reason: undefined});
					if(message.action == "error"){
						if(!message.message) return;
						return vscode.window.showErrorMessage(message.message);
					}
					if(message.action == "save"){
						if(!message.message) return;
						return save(message.message);
					}
				},
				undefined,
				context.subscriptions
			  );
			
			currentPanel.onDidDispose(()=>{
				// Webview Closed
				currentPanel = undefined;
				currentDoc = undefined;
					},
				null,
				context.subscriptions
			);
		})
	};

	function update(e: vscode.TextDocumentChangeEvent){
		if(!currentDoc || !currentPanel) return;

		let svg;
		try{
			svg = JSON.parse(currentDoc.document.getText());
		}catch(e){
			return;
		}
		currentPanel.webview.postMessage({action: "update", svg});
	};

	async function save(svg: string){
		if(!currentDoc || !currentPanel) return;
		let root = lastPath ?? vscode.workspace.workspaceFolders?.[0].uri ?? null;
		if(!root){
			let parts = currentDoc.document.uri.path.split("/");
			let r = parts.slice(0,-1).join("/");
			root = vscode.Uri.file(r);
		}
		let location: vscode.Uri|undefined = await vscode.window.showSaveDialog({
			// Would prefer to use currentDoc, but it seems more straightforward/less
			// error-prone to just use the workspace
			defaultUri: root,
			filters:{"SVG File": ["svg"]},
			title:"Save SVG File"}
		);
		if(!location) return;
		lastPath = location;
		let encoded = new TextEncoder().encode(svg);
		vscode.workspace.fs.writeFile(location, encoded);
	}

	context.subscriptions.push(preview());
}

function buildPage(options: { script: vscode.Uri|null , css: vscode.Uri|null, webview: vscode.Webview}){
	let script = options.script ?? null;
	let css = options.css ?? null;
	let webview = options.webview ?? null;
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSVG Preview</title>
	<meta
		http-equiv="Content-Security-Policy"
		content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource};"
	/>
	${css ? `<link rel="stylesheet" href="${css}" />` : ''}
</head>
<body>
	<p id="sizep">Displayed Size: <span id="size"></span></p>
	<div id="sizesub">
		<p>Scroll: +-100</p>
		<p>Scroll + Ctrl: +-50</p>
		<p>Scroll + Ctrl + Shift: +- 10</p>
		<p>Scroll + Ctrl + Shift + Alt: +- 1</p>
	</div>
    <div id="svg"><svg></svg></div>
	<button id="save">Save SVG</button>
	${script ? `<script src="${script}" type="module"></script>` : '<h1>Could not load Evaluator</h1>'}
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
