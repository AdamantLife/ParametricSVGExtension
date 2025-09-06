# Change Log

## [Unreleased]


## [1.0.0] - 10-13-2024
- Initial release

### Added
- Preview Webview (w/ Command Pallet and Editor/Title Menu Item)
- ParametricSVG Schema- October 2024 Version

## [2.0.0] - 9-6-2025
- Component Reference Update

### Added
- ParametricSVG Schema- September 2025 Version
- From PSVG, added the ability to reference the attributes of svg components in equations.
- From PSVG/Schema, added the "constants" property which can be used to substitute one string for another
  - e.g. if `"constants": {"my_color": "green"}` is declared, then `"stroke": "my_color"` can be used throughout an svg declaration to ensure multiple components use the same stroke color