// Core UI elements used across the app.
const qrTypeSelect = document.getElementById("qr-type");
const dynamicFields = document.getElementById("dynamic-fields");
const generateBtn = document.getElementById("generate-btn");
const downloadBtn = document.getElementById("download-btn");
const statusMessage = document.getElementById("status-message");
const payloadPreview = document.getElementById("payload-preview");
const loader = document.getElementById("loader");
const qrContainer = document.getElementById("qr-container");

let qrInstance = null;

// Fallback script locations for qrcode.js if one CDN fails.
const qrLibraryFallbackUrls = [
  "https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

let qrLibraryLoadPromise = null;

// Metadata for each QR type and the fields required to build its payload.
const qrTypeConfig = {
  website: {
    fields: [
      { key: "url", label: "Website URL", type: "url", placeholder: "example.com", required: true, fullWidth: true }
    ]
  },
  phone: {
    fields: [
      { key: "phone", label: "Phone Number", type: "tel", placeholder: "+919876543210", required: true, fullWidth: true }
    ]
  },
  email: {
    fields: [
      { key: "email", label: "Email Address", type: "email", placeholder: "example@gmail.com", required: true, fullWidth: true }
    ]
  },
  sms: {
    fields: [
      { key: "phone", label: "Phone Number", type: "tel", placeholder: "+919876543210", required: true },
      { key: "message", label: "SMS Message", type: "text", placeholder: "Hello", required: true }
    ]
  },
  wifi: {
    fields: [
      { key: "security", label: "Security Type", type: "select", options: ["WPA", "WEP", "nopass"], required: true },
      { key: "ssid", label: "WiFi Name (SSID)", type: "text", placeholder: "MyWifi", required: true },
      { key: "password", label: "WiFi Password", type: "text", placeholder: "mypassword", required: false }
    ]
  },
  upi: {
    fields: [
      { key: "pa", label: "UPI ID", type: "text", placeholder: "upiid@bank", required: true },
      { key: "pn", label: "Payee Name", type: "text", placeholder: "Name", required: true },
      { key: "am", label: "Amount", type: "number", placeholder: "100", required: false },
      { key: "cu", label: "Currency", type: "text", placeholder: "INR", required: false, defaultValue: "INR" }
    ]
  },
  contact: {
    fields: [
      { key: "firstName", label: "First Name", type: "text", placeholder: "Arthak", required: true },
      { key: "lastName", label: "Last Name", type: "text", placeholder: "Sharma", required: false },
      { key: "phone", label: "Phone", type: "tel", placeholder: "+919876543210", required: true },
      { key: "email", label: "Email", type: "email", placeholder: "example@gmail.com", required: false },
      { key: "org", label: "Organization", type: "text", placeholder: "My Company", required: false },
      { key: "title", label: "Job Title", type: "text", placeholder: "Developer", required: false },
      { key: "website", label: "Website", type: "url", placeholder: "https://example.com", required: false, fullWidth: true },
      { key: "address", label: "Address", type: "textarea", placeholder: "City, State", required: false, fullWidth: true }
    ]
  },
  location: {
    fields: [
      { key: "lat", label: "Latitude", type: "text", placeholder: "28.6139", required: true },
      { key: "lng", label: "Longitude", type: "text", placeholder: "77.2090", required: true }
    ]
  }
};

/**
 * Shows helper or error messages under the form.
 */
function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";

  if (type) {
    statusMessage.classList.add(type);
  }
}

/**
 * Escapes characters used by WiFi payload format.
 */
function escapeWifiValue(value) {
  return String(value).replace(/([\\;,:\"])/g, "\\$1");
}

/**
 * Escapes line breaks and commas for vCard values.
 */
function escapeVCardValue(value) {
  return String(value)
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

/**
 * Ensure URL starts with protocol for website QR type.
 */
function normalizeUrl(url) {
  const trimmed = url.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Build dynamic inputs whenever QR type changes.
 */
function renderDynamicFields() {
  const selectedType = qrTypeSelect.value;
  const config = qrTypeConfig[selectedType];

  dynamicFields.innerHTML = "";

  config.fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = `form-group ${field.fullWidth ? "full-width" : ""}`.trim();

    const label = document.createElement("label");
    label.setAttribute("for", field.key);
    label.textContent = field.label;

    let inputElement;

    if (field.type === "textarea") {
      inputElement = document.createElement("textarea");
    } else if (field.type === "select") {
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

    if (field.defaultValue) {
      inputElement.value = field.defaultValue;
    }

    wrapper.appendChild(label);
    wrapper.appendChild(inputElement);
    dynamicFields.appendChild(wrapper);
  });
}

/**
 * Reads current values from dynamic form fields.
 */
function getFormValues() {
  const values = {};
  const inputs = dynamicFields.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    values[input.id] = input.value.trim();
  });

  return values;
}

/**
 * Validates required fields according to the selected type configuration.
 */
function validateValues(type, values) {
  const config = qrTypeConfig[type];

  for (const field of config.fields) {
    if (field.required && !values[field.key]) {
      return `${field.label} is required.`;
    }
  }

  return "";
}

/**
 * Create final payload string exactly in the standard format
 * for each QR type.
 */
function buildQrPayload(type, values) {
  switch (type) {
    case "website":
      return normalizeUrl(values.url);

    case "phone":
      return `tel:${values.phone}`;

    case "email":
      return `mailto:${values.email}`;

    case "sms":
      return `smsto:${values.phone}:${values.message}`;

    case "wifi": {
      const security = values.security || "WPA";
      const ssid = escapeWifiValue(values.ssid);
      const password = escapeWifiValue(values.password || "");
      return `WIFI:T:${security};S:${ssid};P:${password};;`;
    }

    case "upi": {
      const params = new URLSearchParams();
      params.set("pa", values.pa);
      params.set("pn", values.pn);

      if (values.am) {
        params.set("am", values.am);
      }

      params.set("cu", values.cu || "INR");
      return `upi://pay?${params.toString()}`;
    }

    case "contact": {
      const firstName = escapeVCardValue(values.firstName || "");
      const lastName = escapeVCardValue(values.lastName || "");
      const fullName = `${values.firstName || ""} ${values.lastName || ""}`.trim();

      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${lastName};${firstName};;;`,
        `FN:${escapeVCardValue(fullName || values.firstName || "Contact")}`
      ];

      if (values.phone) {
        lines.push(`TEL:${escapeVCardValue(values.phone)}`);
      }

      if (values.email) {
        lines.push(`EMAIL:${escapeVCardValue(values.email)}`);
      }

      if (values.org) {
        lines.push(`ORG:${escapeVCardValue(values.org)}`);
      }

      if (values.title) {
        lines.push(`TITLE:${escapeVCardValue(values.title)}`);
      }

      if (values.website) {
        lines.push(`URL:${escapeVCardValue(normalizeUrl(values.website))}`);
      }

      if (values.address) {
        lines.push(`ADR:;;${escapeVCardValue(values.address)};;;;`);
      }

      lines.push("END:VCARD");
      return lines.join("\n");
    }

    case "location":
      return `https://maps.google.com/?q=${values.lat},${values.lng}`;

    default:
      throw new Error("Unsupported QR type.");
  }
}

/**
 * Dynamically load fallback qrcode.js script if primary script failed.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script failed: ${src}`));

    document.head.appendChild(script);
  });
}

/**
 * Make sure QRCode class exists before trying to generate.
 */
async function ensureQrLibraryLoaded() {
  if (window.QRCode) {
    return;
  }

  if (!qrLibraryLoadPromise) {
    qrLibraryLoadPromise = (async () => {
      for (const url of qrLibraryFallbackUrls) {
        try {
          await loadScript(url);

          if (window.QRCode) {
            return;
          }
        } catch (error) {
          console.warn("Fallback script failed:", error);
        }
      }

      throw new Error("Could not load qrcode.js library.");
    })();
  }

  await qrLibraryLoadPromise;
}

/**
 * Renders QR code into #qr-container using qrcode.js.
 */
async function generateQrCode() {
  const type = qrTypeSelect.value;
  const values = getFormValues();
  const validationError = validateValues(type, values);

  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  let payload;

  try {
    payload = buildQrPayload(type, values);
  } catch (error) {
    setStatus("Could not create QR payload. Please check your fields.", "error");
    console.error(error);
    return;
  }

  loader.classList.remove("hidden");
  qrContainer.innerHTML = "";
  payloadPreview.textContent = payload;
  generateBtn.disabled = true;
  downloadBtn.disabled = true;
  setStatus("Generating QR code...");

  try {
    await ensureQrLibraryLoaded();

    // Tiny delay so users can see loading state on very fast systems.
    await new Promise((resolve) => setTimeout(resolve, 180));

    qrInstance = new window.QRCode(qrContainer, {
      text: payload,
      width: 260,
      height: 260,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });

    loader.classList.add("hidden");
    setStatus("QR code generated successfully.", "success");
    downloadBtn.disabled = false;
  } catch (error) {
    loader.classList.add("hidden");
    setStatus("Failed to generate QR code. Check connection and try again.", "error");
    console.error("QR generation error:", error);
  } finally {
    generateBtn.disabled = false;
  }
}

/**
 * Download rendered QR as PNG.
 * qrcode.js usually generates a <canvas>, which can be exported directly.
 */
function downloadQrCode() {
  const canvas = qrContainer.querySelector("canvas");

  if (canvas) {
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "qr-code.png";
    link.click();
    return;
  }

  // Fallback path if library produced an <img> instead of <canvas>.
  const image = qrContainer.querySelector("img");

  if (image && image.src) {
    const link = document.createElement("a");
    link.href = image.src;
    link.download = "qr-code.png";
    link.click();
    return;
  }

  setStatus("Generate a QR code before downloading.", "error");
}

// Update fields when type changes.
qrTypeSelect.addEventListener("change", () => {
  renderDynamicFields();
  payloadPreview.textContent = "No value generated yet.";
  qrContainer.innerHTML = "";
  setStatus("");
  downloadBtn.disabled = true;
});

// Create QR on button click.
generateBtn.addEventListener("click", generateQrCode);

// Download QR as PNG.
downloadBtn.addEventListener("click", downloadQrCode);

// Initial UI render on page load.
renderDynamicFields();
setStatus("Choose a QR type and fill details.");
