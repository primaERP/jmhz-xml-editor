# REGZEC Přílohy (Attachments) — Implementation Plan

## Problem

The REGZEC XSD (`schema/REGZEC25.xsd`) allows up to 9 file attachments per employee via `<attachs>/<attach>`, but the editor currently ignores them entirely. Users need full attachment management: view existing, add new, edit metadata, download, and remove.

## Schema facts (from REGZEC25.xsd lines 985–1027)

- `attachsType` is an optional child of each `employee` element
- Contains 0–9 `<attach>` elements (`maxOccurs="9"`)
- Each `<attach>` has three attributes:
  - `name` (required) — filename incl. extension, max 100 chars
  - `desc` (optional) — description, max 100 chars
  - `data` (required) — file content as `xs:base64Binary`, minLength 1

## Scope: full management

- Display existing attachments from loaded XML
- Add new attachments via file picker (base64-encode into `data` attribute)
- Remove individual attachments
- Download/save existing attachments (decode base64 → Blob → browser download)
- Edit name and desc metadata inline
- Enforce the 9-attachment cap in the UI
- Surface attachment validation errors and support error navigation

## Architecture decisions

1. **Not a regular section/field** — attachments carry binary blobs in a single attribute, not a set of typed fields. They need custom UI (file list + upload), not the standard field-table layout.

2. **Employee mirror extension** — each employee mirror will gain an `attachments` reactive array of `{ name, desc, dataSize, el }` objects. We do NOT store the full base64 string in the mirror (it can be huge); we store a reference to the XML DOM element and the decoded size for display. The actual `data` attribute is read on-demand for download.

3. **Dedicated section card** — a new "Přílohy" section card at the bottom of each employee, rendered with custom markup instead of `v-for field in getVisibleFields(...)`. It shows a list of attachment rows (filename, desc, size, download/remove buttons) and an "Přidat přílohu" button that opens a file picker.

4. **XML DOM manipulation** — adding/removing attachments mutates the live XML DOM directly (same pattern as `commitEdit` and `removeInstance`), then rebuilds the employee mirror. This keeps save/export consistent with no separate serialization step.

5. **formats.js section entry** — a new section `{ id: 'attachs', label: 'Přílohy', element: 'attachs', _custom: 'attachments' }` is added to REGZEC_CONFIG.sections. The `_custom` flag tells the template to render the special attachment UI instead of the field table.

6. **Validation** — the existing XSD validation already covers `<attachs>/<attach>` since the full XML is validated. Attachment errors will be mapped to the `attachs` section so they appear under the Přílohy card header badge and support `Přejít` navigation.

## Files to modify

| File | Changes |
|------|---------|
| `formats.js` | Add `attachs` section to REGZEC_CONFIG.sections. Add to relevant `actionSections`. |
| `src/runtime/ViewerApp.jsx` | Extend the Solid runtime to parse `<attachs>/<attach>` into an `attachments` array. Add `addAttachment`, `removeAttachment`, `downloadAttachment` functions. Wire undo support. Update validation field mapping for attachs errors. |
| `src/runtime/ViewerApp.jsx` | Add a conditional branch in the Solid component for `section._custom === 'attachments'` that renders the attachment list UI instead of the field table. Include file-upload button, download, remove. |
| `src/styles/viewer.css` | Add styles for `.attachment-list`, `.attachment-item`, `.attachment-actions`, `.btn-add-attachment`. |

## Implementation steps

1. Add prilohy section to REGZEC formats config
2. Parse existing prilohy from XML into employee mirror
3. Build prilohy UI section in template
4. Implement file upload and base64 encoding
5. Implement priloha download/preview
6. Implement priloha removal
7. Implement priloha name/desc editing
8. Handle prilohy validation and error navigation
9. Style the prilohy section
10. Build and verify prilohy feature

## Notes

- The word "příloha" (plural "přílohy") means "attachment" in Czech — UI labels use Czech
- base64 encoding/decoding uses browser-native `btoa`/`atob` (or `FileReader.readAsDataURL`) — no external library needed
- Attachment data can be large; avoid keeping decoded copies in reactive state
- The 9-attachment limit is enforced by hiding the add button when count reaches 9
- Attachments are REGZEC-only; JMHZ format is unaffected
