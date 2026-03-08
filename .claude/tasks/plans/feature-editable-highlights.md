# Make Highlights Editable in ListInput

## Context
In the Resume Editor's Edit Entry form, highlight items are displayed as static `<span>` elements in the `ListInput` component. Users can add/remove highlights but cannot edit existing ones inline. The user wants to click into a highlight's text and edit it directly, then save via the existing Save button.

## Change
**Single file:** `frontend/src/components/admin/ListInput.tsx`

Replace the static `<span>` on line 39 with an `<input>` element that:
- Displays the current highlight text as the input value
- On change, calls `onChange` with an updated copy of the `value` array (item at index `i` replaced)
- Uses the same styling as the existing row (transparent background to blend with the gray row container)

### Before (line 39):
```tsx
<span className="flex-1 text-sm text-white">{item}</span>
```

### After:
```tsx
<input
  type="text"
  value={item}
  onChange={(e) => {
    const updated = [...value];
    updated[i] = e.target.value;
    onChange(updated);
  }}
  className="flex-1 text-sm text-white bg-transparent outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
/>
```

No backend, API, or database changes needed — the existing save flow already sends the full `highlights` array and persists it correctly.

## Verification
1. Run `npx tsc --noEmit` in `frontend/` to check types
2. Open Resume Editor → Edit an entry with highlights
3. Click into a highlight text → verify it's editable
4. Modify text → click Save → verify the change persists after reload
5. Confirm add/remove still work as before
