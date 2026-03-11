# QR Code Generator (Multi-Type)

This project is an upgraded QR Code Generator using:

- `HTML`
- `CSS`
- `JavaScript`
- `qrcode.js`

## Supported QR Types

1. Website URL
2. Phone Number
3. Email
4. SMS
5. WiFi
6. UPI Payment
7. Contact (vCard)
8. Google Maps Location

## Files

```text
QR_CODE_Generator/
  index.html
  styles.css
  script.js
  README.md
```

## How It Works

1. User selects a QR type from dropdown.
2. JavaScript renders only required input fields dynamically.
3. On Generate, values are validated.
4. App converts inputs into the final standard payload format.
5. `qrcode.js` renders QR inside the preview area.
6. User can download the QR as PNG.

## Example Formats

- Website: `https://example.com`
- Phone: `tel:+919876543210`
- Email: `mailto:example@gmail.com`
- SMS: `smsto:+919876543210:Hello`
- WiFi: `WIFI:T:WPA;S:WifiName;P:Password;;`
- UPI: `upi://pay?pa=upiid@bank&pn=Name&am=100&cu=INR`
- Location: `https://maps.google.com/?q=latitude,longitude`
- Contact: generated as `vCard (VERSION:3.0)` payload

## Run

Open `index.html` in a browser, choose type, fill fields, generate, then download PNG.