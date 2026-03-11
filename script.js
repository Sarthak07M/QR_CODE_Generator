
const input = document.getElementById("qr-input");
const generateBtn = document.getElementById("generate-btn");
const downloadBtn = document.getElementById("download-btn");
const qrImage = document.getElementById("qr-image");
const loader = document.getElementById("loader");
const statusMessage = document.getElementById("status-message");

let currentQrImageUrl = "";


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

function buildQrApiUrls(text) {
  return QR_API_BUILDERS.map((buildUrl) => buildUrl(text));
}

function waitForImageLoad(imageUrl) {
  return new Promise((resolve, reject) => {
    const tempImage = new Image();

    tempImage.onload = () => resolve();
    tempImage.onerror = () => reject(new Error("QR image failed to load."));
    tempImage.src = imageUrl;
  });
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";

  if (type) {
    statusMessage.classList.add(type);
  }
}

function showLoading() {
  loader.classList.remove("hidden");
  qrImage.classList.add("hidden");
  setStatus("Generating QR code...");
}


function showQrImage() {
  loader.classList.add("hidden");
  qrImage.classList.remove("hidden");
}

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


function downloadQrCode() {
  if (!currentQrImageUrl) {
    setStatus("Generate a QR code before downloading.", "error");
    return;
  }


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

generateBtn.addEventListener("click", generateQrCode);


downloadBtn.addEventListener("click", downloadQrCode);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    generateQrCode();
  }
});
