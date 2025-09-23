document.querySelectorAll("[data-i18n]").forEach((el) => {
  const message = chrome.i18n.getMessage(el.dataset.i18n);
  if (message) el.textContent = message;
});

const button = document.getElementById("runSetup");
const status = document.getElementById("status");

const colors = { info: "#a1a1aa", success: "#22c55e", error: "#ef4444" };

function setStatus(messageKey, type = "info") {
  const message = chrome.i18n.getMessage(messageKey) || messageKey;
  status.textContent = message;
  status.style.color = colors[type];
}

function setButtonLoading(isLoading) {
  if (isLoading) {
    button.classList.add("loading");
    button.disabled = true;
  } else {
    button.classList.remove("loading");
    button.disabled = false;
  }
}

button.addEventListener("click", () => {
  setStatus("statusProcessing", "info");
  setButtonLoading(true);

  chrome.runtime.sendMessage({ action: "runSetup" }, (response) => {
    setButtonLoading(false);

    if (chrome.runtime.lastError) {
      setStatus(`❌ ${chrome.runtime.lastError.message}`, "error");
      return;
    }

    if (!response.success) {
      const msg = !response.error
        ? chrome.i18n.getMessage(response.errorKey)
        : response.error;
      setStatus(`❌ ${msg}`, "error");
      return;
    }

    const msg =
      chrome.i18n.getMessage(response.messageKey) || "Setup completed!";
    setStatus(msg, "success");
  });
});
