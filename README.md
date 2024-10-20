# ParametricSVG Extension

<div style="text-align:center;"><img src="./content/PSVGExtPreview.gif" style="max-height:400px;"/></div>

## Features

The ParametricSVG Extension speeds up the development of ParametricSVG json files in VSCode by including the PSVG Schema ([see primary repo](https://github.com/AdamantLife/ParametricSVG)) and including a Preview Window.

<div style="text-align:center;"><img src="./content/editorbar.png" style="max-height:2.5em;"/></div>

The preview window can be opened while editing `.psvg.json` files using the **'Preview PSVG'** button in the top right and is updated with each (valid) change to the file. If the json is not formatted correctly (e.x.- trailing comma) then the preview will fail silently; if PSVG's Parser raises an error, that error will be passed to the VSCode's window as an alert. Since the preview is updated on each keystroke, alerts are rate-limited as to not be an inconvenience.

## Known Issues and Limitations

For security purposes, the string **"script"** cannot appear in the JSON. This also means that the `<script>` component cannot be parsed by PSVG.

The security settings in VSCode prevents `in-line styling`, therefore the Previewed SVG will not have any `style` attributes defined in the json.

The current version of the PSVG Schema does not validate the `component.children` property. PSVG's parser will add all child components to the parent and it will be up to the browser/viewer to determine what to do with invalid child elements.

The above also means that the Schema will provide all types of SVGElement for `child.type` autocomplete.

See [ParametricSVG on GitHub](https://github.com/AdamantLife/ParametricSVG) for any additional issues for PSVG in general and [ParametricSVGExtension](https://github.com/AdamantLife/ParametricSVGExtension) for additional issues specific to the extension.

## Release Notes

Releases will occur both for Extension improvements as well as for downstream improvements to ParametricSVG

### 1.0.0

Initial release of the ParametricSVG Extension. Supports the October 2024 version of the Schema.