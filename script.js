// Grab the elements we need from the page.
const input = document.getElementById("qr-input");
const generateBtn = document.getElementById("generate-btn");
const downloadBtn = document.getElementById("download-btn");
const qrImage = document.getElementById("qr-image");
const loader = document.getElementById("loader");
const statusMessage = document.getElementById("status-message");

// We store the generated image data URL here so we can download it later.
let currentQrImageUrl = "";

// Multiple public endpoints for reliability.
const QR_API_BUILDERS = [
  (text) => {
    const params = new URLSearchParams({
      size: "520x520",
      margin: "10",
      data: text
    });

    return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  },
  (text) => {
    const params = new URLSearchParams({
      text,
      size: "520"
    });

    return `https://quickchart.io/qr?${params.toString()}`;
  }
];

/**
 * Builds candidate QR API URLs for provided text.
 * @param {string} text - content to encode in QR
 * @returns {string[]}
 */
function buildQrApiUrls(text) {
  return QR_API_BUILDERS.map((buildUrl) => buildUrl(text));
}

/**
 * Wait for the current image URL to load (or fail).
 * This helps us show a clear message if network access is blocked.
 * @param {string} imageUrl
 * @returns {Promise<void>}
 */
function waitForImageLoad(imageUrl) {
  return new Promise((resolve, reject) => {
    const tempImage = new Image();

    tempImage.onload = () => resolve();
    tempImage.onerror = () => reject(new Error("QR image failed to load."));
    tempImage.src = imageUrl;
  });
}

/**
 * Updates user-facing status text and color.
 * @param {string} message - text to show on screen
 * @param {"success" | "error" | ""} type - visual style for feedback
 */
function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";

  if (type) {
    statusMessage.classList.add(type);
  }
}

/**
 * Shows loading spinner while code is being generated.
 */
function showLoading() {
  loader.classList.remove("hidden");
  qrImage.classList.add("hidden");
  setStatus("Generating QR code...");
}

/**
 * Hides spinner and shows generated QR image.
 */
function showQrImage() {
  loader.classList.add("hidden");
  qrImage.classList.remove("hidden");
}

/**
 * Main function to generate a QR code from user input.
 * Uses QRCode.toDataURL to return a PNG base64 string.
 */
async function generateQrCode() {
  const text = input.value.trim();

  if (!text) {
    setStatus("Please enter text or a URL first.", "error");
    downloadBtn.disabled = true;
    return;
  }

  showLoading();
  generateBtn.disabled = true;
  downloadBtn.disabled = true;

  try {
    // Try multiple providers so one blocked endpoint does not break generation.
    const candidateUrls = buildQrApiUrls(text);
    let loaded = false;

    for (const candidateUrl of candidateUrls) {
      try {
        await waitForImageLoad(candidateUrl);
        currentQrImageUrl = candidateUrl;
        loaded = true;
        break;
      } catch (error) {
        console.warn("QR provider failed:", candidateUrl, error);
      }
    }

    if (!loaded) {
      throw new Error("All QR providers failed.");
    }

    // Display generated QR code on the page.
    qrImage.src = currentQrImageUrl;
    showQrImage();
    setStatus("QR code generated successfully.", "success");
    downloadBtn.disabled = false;
  } catch (error) {
    loader.classList.add("hidden");
    setStatus("Could not load QR image. Please check your internet connection and try again.", "error");
    console.error("QR generation error:", error);
  } finally {
    generateBtn.disabled = false;
  }
}

/**
 * Downloads the currently generated QR image as PNG.
 */
function downloadQrCode() {
  if (!currentQrImageUrl) {
    setStatus("Generate a QR code before downloading.", "error");
    return;
  }

  // Fetch image as blob so browser downloads file reliably.
  fetch(currentQrImageUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Download request failed.");
      }

      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "qr-code.png";
      link.click();
      URL.revokeObjectURL(objectUrl);
    })
    .catch((error) => {
      setStatus("Download failed. Please try again.", "error");
      console.error("QR download error:", error);
    });
}

// Generate when the button is clicked.
generateBtn.addEventListener("click", generateQrCode);

// Download when the download button is clicked.
downloadBtn.addEventListener("click", downloadQrCode);

// Bonus UX: press Enter inside the input field to generate quickly.
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    generateQrCode();
  }
});
