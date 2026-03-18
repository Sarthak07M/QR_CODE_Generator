// Main UI references.
const qrTypeSelect = document.getElementById("qr-type");
const dynamicFields = document.getElementById("dynamic-fields");
const qrColorInput = document.getElementById("qr-color");
const bgColorInput = document.getElementById("bg-color");
const logoUploadInput = document.getElementById("logo-upload");
const generateBtn = document.getElementById("generate-btn");
const downloadBtn = document.getElementById("download-btn");
const copyBtn = document.getElementById("copy-btn");
const statusMessage = document.getElementById("status-message");
const payloadPreview = document.getElementById("payload-preview");
const loader = document.getElementById("loader");
const qrContainer = document.getElementById("qr-container");

const QR_SIZE = 320;
let logoImage = null;
let livePreviewTimer = null;

// Field definitions for each supported QR type.
const qrTypeConfig = {
  website: {
    fields: [
      {
        key: "url",
        label: "Website URL",
        type: "url",
        placeholder: "https://example.com",
        required: true,
        fullWidth: true
      }
    ]
  },
  wifi: {
    fields: [
      {
        key: "security",
        label: "Security Type",
        type: "select",
        options: ["WPA", "WEP", "nopass"],
        required: true
      },
      {
        key: "ssid",
        label: "WiFi Name (SSID)",
        type: "text",
        placeholder: "MyWifi",
        required: true
      },
      {
        key: "password",
        label: "WiFi Password",
        type: "text",
        placeholder: "mypassword",
        required: false
      }
    ]
  },
  email: {
    fields: [
      {
        key: "email",
        label: "Email Address",
        type: "email",
        placeholder: "hello@example.com",
        required: true,
        fullWidth: true
      }
    ]
  },
  phone: {
    fields: [
      {
        key: "phone",
        label: "Phone Number",
        type: "tel",
        placeholder: "+919876543210",
        required: true,
        fullWidth: true
      }
    ]
  }
};

/**
 * Set helper/success/error status text.
 */
function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";

  if (type) {
    statusMessage.classList.add(type);
  }
}

/**
 * Escape WiFi payload special characters.
 */
function escapeWifiValue(value) {
  return String(value).replace(/([\\;,:\"])/g, "\\$1");
}

/**
 * Ensure website values always contain protocol.
 */
function normalizeUrl(url) {
  const trimmed = url.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Build the dynamic inputs based on selected QR type.
 */
function renderDynamicFields() {
  const config = qrTypeConfig[qrTypeSelect.value];
  dynamicFields.innerHTML = "";

  config.fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = `form-group ${field.fullWidth ? "full-width" : ""}`.trim();

    const label = document.createElement("label");
    label.setAttribute("for", field.key);
    label.textContent = field.label;

    let inputElement;

    if (field.type === "select") {
      inputElement = document.createElement("select");
      field.options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        inputElement.appendChild(option);
      });
    } else {
      inputElement = document.createElement("input");
      inputElement.type = field.type;
    }

    inputElement.id = field.key;
    inputElement.placeholder = field.placeholder || "";
    inputElement.required = Boolean(field.required);

    // Live preview as users type.
    inputElement.addEventListener("input", scheduleLivePreview);
    inputElement.addEventListener("change", scheduleLivePreview);

    wrapper.appendChild(label);
    wrapper.appendChild(inputElement);
    dynamicFields.appendChild(wrapper);
  });
}

/**
 * Read current values from dynamic form fields.
 */
function getFormValues() {
  const values = {};

  dynamicFields.querySelectorAll("input, select").forEach((element) => {
    values[element.id] = element.value.trim();
  });

  return values;
}

/**
 * Validate required fields for selected QR type.
 */
function validateValues(values) {
  const config = qrTypeConfig[qrTypeSelect.value];

  for (const field of config.fields) {
    if (field.required && !values[field.key]) {
      return `${field.label} is required.`;
    }
  }

  return "";
}

/**
 * Build payload string based on selected QR type.
 */
function buildPayload(values) {
  const type = qrTypeSelect.value;

  if (type === "website") {
    return normalizeUrl(values.url);
  }

  if (type === "phone") {
    return `tel:${values.phone}`;
  }

  if (type === "email") {
    return `mailto:${values.email}`;
  }

  if (type === "wifi") {
    const security = values.security || "WPA";
    const ssid = escapeWifiValue(values.ssid);
    const password = escapeWifiValue(values.password || "");
    return `WIFI:T:${security};S:${ssid};P:${password};;`;
  }

  throw new Error("Unsupported QR type.");
}

/**
 * Convert an uploaded logo file into an Image object.
 */
function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        resolve({ image: img });
      };
      img.onerror = () => reject(new Error("Invalid logo image."));
      img.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Could not read logo file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate QR to canvas using qrcode.js.
 */
function generateRawQrCanvas(payload, fgColor, bgColor) {
  qrContainer.innerHTML = "";

  // qrcode.js draws directly inside container.
  // We choose high base size for better PNG output quality.
  new window.QRCode(qrContainer, {
    text: payload,
    width: QR_SIZE,
    height: QR_SIZE,
    colorDark: fgColor,
    colorLight: bgColor,
    correctLevel: window.QRCode.CorrectLevel.H
  });

  const canvas = qrContainer.querySelector("canvas");

  if (!canvas) {
    throw new Error("QR canvas generation failed.");
  }

  return canvas;
}

/**
 * Draw rounded rectangle helper for logo background plate.
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * If a logo is uploaded, draw it at center of QR canvas.
 */
function applyLogoToCanvas(canvas) {
  if (!logoImage) {
    return;
  }

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  const logoSize = Math.floor(canvas.width * 0.22);
  const x = Math.floor((canvas.width - logoSize) / 2);
  const y = Math.floor((canvas.height - logoSize) / 2);
  const platePadding = 10;

  // White rounded plate helps preserve scan reliability.
  drawRoundedRect(
    ctx,
    x - platePadding,
    y - platePadding,
    logoSize + platePadding * 2,
    logoSize + platePadding * 2,
    16
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.drawImage(logoImage, x, y, logoSize, logoSize);
}

/**
 * Build the final PNG data URL from current preview canvas.
 */
function getCurrentQrDataUrl() {
  const canvas = qrContainer.querySelector("canvas");

  if (!canvas) {
    return "";
  }

  return canvas.toDataURL("image/png");
}

/**
 * Perform generation flow with optional quiet mode for live preview.
 */
function generateQr({ quiet = false } = {}) {
  const values = getFormValues();
  const validationError = validateValues(values);

  if (validationError) {
    if (!quiet) {
      setStatus(validationError, "error");
    }
    return;
  }

  let payload = "";

  try {
    payload = buildPayload(values);
  } catch (error) {
    if (!quiet) {
      setStatus("Could not build QR payload. Please check input values.", "error");
    }
    console.error(error);
    return;
  }

  const fgColor = qrColorInput.value || "#0f172a";
  const bgColor = bgColorInput.value || "#ffffff";

  loader.classList.remove("hidden");

  try {
    const canvas = generateRawQrCanvas(payload, fgColor, bgColor);
    applyLogoToCanvas(canvas);

    payloadPreview.textContent = payload;
    downloadBtn.disabled = false;
    copyBtn.disabled = false;

    if (!quiet) {
      setStatus("QR code generated successfully.", "success");
    }
  } catch (error) {
    if (!quiet) {
      setStatus("Failed to generate QR code. Try again.", "error");
    }
    console.error(error);
  } finally {
    loader.classList.add("hidden");
  }
}

/**
 * Debounced generation for live preview while typing.
 */
function scheduleLivePreview() {
  clearTimeout(livePreviewTimer);

  livePreviewTimer = setTimeout(() => {
    generateQr({ quiet: true });
  }, 250);
}

/**
 * Download current QR PNG.
 */
function downloadQr() {
  const dataUrl = getCurrentQrDataUrl();

  if (!dataUrl) {
    setStatus("Generate a QR code before downloading.", "error");
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "quickqr-code.png";
  link.click();
}

/**
 * Copy current QR image to clipboard.
 */
async function copyQrImage() {
  const dataUrl = getCurrentQrDataUrl();

  if (!dataUrl) {
    setStatus("Generate a QR code before copying.", "error");
    return;
  }

  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error("Clipboard image API not available.");
    }

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);

    setStatus("QR image copied to clipboard.", "success");
  } catch (error) {
    // Fallback: copy data URL text if image copy is not available.
    try {
      await navigator.clipboard.writeText(dataUrl);
      setStatus("Image copy unsupported here. Data URL copied instead.", "success");
    } catch (fallbackError) {
      setStatus("Copy failed. Please try download instead.", "error");
      console.error(fallbackError);
    }

    console.error(error);
  }
}

/**
 * Reset current preview when structure changes.
 */
function resetPreview() {
  qrContainer.innerHTML = "";
  payloadPreview.textContent = "No value generated yet.";
  downloadBtn.disabled = true;
  copyBtn.disabled = true;
}

// Generate manually.
generateBtn.addEventListener("click", () => {
  generateQr({ quiet: false });
});

// Download and copy handlers.
downloadBtn.addEventListener("click", downloadQr);
copyBtn.addEventListener("click", copyQrImage);

// Handle QR type changes.
qrTypeSelect.addEventListener("change", () => {
  renderDynamicFields();
  resetPreview();
  setStatus("QR type changed. Fill fields to see live preview.");
});

// Regenerate QR when color changes.
qrColorInput.addEventListener("input", scheduleLivePreview);
bgColorInput.addEventListener("input", scheduleLivePreview);

// Logo upload handling.
logoUploadInput.addEventListener("change", async () => {
  const file = logoUploadInput.files && logoUploadInput.files[0];

  if (!file) {
    logoImage = null;
    scheduleLivePreview();
    return;
  }

  try {
    const result = await readLogoFile(file);
    logoImage = result.image;

    // Regenerate with logo immediately.
    scheduleLivePreview();
    setStatus("Logo uploaded. Generating preview...", "success");
  } catch (error) {
    logoImage = null;
    setStatus("Invalid logo file. Please upload a valid image.", "error");
    console.error(error);
  }
});

// Initial render for default type.
renderDynamicFields();
setStatus("Fill the form to see live preview.");

// Trigger an initial preview for better UX.
scheduleLivePreview();
