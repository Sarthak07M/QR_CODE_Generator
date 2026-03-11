# QR Code Generator

A complete beginner-friendly QR Code Generator built with:

- `HTML`
- `CSS`
- `JavaScript`

It supports:

- Text or URL input
- Dynamic QR code generation
- Loading animation during generation
- Download as PNG
- Mobile responsive layout
- Modern UI styling

## 1. Project Structure

```text
QR_CODE_Generator/
  index.html
  styles.css
  script.js
  README.md
```

## 2. Step-by-Step Implementation

### Step 1: Build the HTML Layout

In `index.html`, create:

- A heading and short description
- Input field for text/URL
- `Generate QR` button
- `Download PNG` button
- Status message area
- Output area with:
  - Loading spinner
  - Image element to display generated QR

Also include:

- Google Font for modern typography
- `script.js`

### Step 2: Add Modern Responsive Styling

In `styles.css`, add:

- CSS variables for colors and theme
- Soft gradient + radial background
- Glass-style card (`backdrop-filter` + shadow)
- Styled form controls and buttons
- Spinner animation using `@keyframes spin`
- Responsive rules for small screens (`@media`)

### Step 3: Write JavaScript Logic

In `script.js`:

1. Select all needed DOM elements.
2. Create helper functions:
	- `setStatus()`
	- `showLoading()`
	- `showQrImage()`
3. Create `generateQrCode()`:
	- Read and validate user input.
	- Show loader and disable buttons.
	- Build QR API URL with encoded text.
	- Load the image and set `img.src`.
	- Enable download button.
4. Create `downloadQrCode()`:
	- Build temporary `<a>` element.
	- Assign `href` to QR data URL.
	- Set `download` filename and trigger click.
5. Add event listeners for:
	- Generate button click
	- Download button click
	- Enter key in input

## 3. How QR Code Generation Works

This project generates QR images by calling a public QR API endpoint.

When the user clicks Generate:

1. Input text is read from the text box.
2. JavaScript builds a URL like:
	- `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=10&data=...`
3. The text is URL-encoded so special characters are handled safely.
4. The app waits for the image to load.
5. Once loaded, the URL is assigned to `<img src="...">` so QR appears instantly.

For download:

1. Fetch the generated image URL.
2. Convert response to Blob.
3. Create a temporary object URL.
4. Trigger a temporary `<a download>` click to save `qr-code.png`.

## 4. Run the Project

Since this is a frontend-only app:

1. Open `index.html` in your browser.
2. Type text or URL.
3. Click `Generate QR`.
4. Click `Download PNG`.

Tip: You can also use VS Code Live Server for auto-reload while editing.

## 5. Beginner Notes

- The code is intentionally commented to explain each important section.
- Generation is asynchronous (`async/await`) so the UI can show loading state.
- Buttons are disabled during generation to avoid duplicate clicks.
- Input validation prevents empty QR generation.