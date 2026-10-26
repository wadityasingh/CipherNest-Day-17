/**
 * CipherNest | Password Atelier
 * Vanilla JavaScript (ES6+) — Web Crypto Unbiased Generation & UI Controller
 */

(function () {
  "use strict";

  // Character Category Definitions
  const CHAR_CATEGORIES = {
    uppercase: {
      key: "uppercase",
      label: "Uppercase",
      chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    },
    lowercase: {
      key: "lowercase",
      label: "Lowercase",
      chars: "abcdefghijklmnopqrstuvwxyz",
    },
    numbers: {
      key: "numbers",
      label: "Numbers",
      chars: "0123456789",
    },
    symbols: {
      key: "symbols",
      label: "Symbols",
      chars: "!@#$%^&*",
    },
  };

  const MIN_LENGTH = 4;
  const MAX_LENGTH = 64;
  const DEFAULT_LENGTH = 16;

  // DOM References
  const form = document.getElementById("atelier-form");
  const passwordDisplayBox = document.getElementById("password-display-box");
  const passwordOutput = document.getElementById("password-output");
  const outputStatus = document.getElementById("output-status");
  const feedbackMessage = document.getElementById("feedback-message");
  const cryptoWarning = document.getElementById("crypto-warning");

  const lengthSlider = document.getElementById("length-slider");
  const lengthNumber = document.getElementById("length-number");

  const checkboxes = {
    uppercase: document.getElementById("chk-uppercase"),
    lowercase: document.getElementById("chk-lowercase"),
    numbers: document.getElementById("chk-numbers"),
    symbols: document.getElementById("chk-symbols"),
  };

  const validationError = document.getElementById("validation-error");

  const strengthMeter = document.getElementById("strength-meter");
  const strengthLabel = document.getElementById("strength-label");

  const generateBtn = document.getElementById("generate-btn");
  const regenerateBtn = document.getElementById("regenerate-btn");
  const copyBtn = document.getElementById("copy-btn");
  const copyBtnLabel = document.getElementById("copy-btn-label");

  // Application State (in-memory only)
  let currentPassword = "";
  let copyFeedbackTimer = null;

  /**
   * Checks whether the browser supports Web Crypto API's getRandomValues.
   */
  function isWebCryptoAvailable() {
    return (
      typeof window !== "undefined" &&
      typeof window.crypto !== "undefined" &&
      typeof window.crypto.getRandomValues === "function"
    );
  }

  /**
   * Returns an unbiased random integer in the range [0, maxExclusive - 1].
   * Uses rejection sampling with crypto.getRandomValues(Uint32Array) to avoid modulo bias.
   */
  function getUnbiasedRandomInt(maxExclusive) {
    if (maxExclusive <= 1) {
      return 0;
    }

    if (isWebCryptoAvailable()) {
      const maxUint32 = 0xffffffff;
      const limit = maxUint32 - ((maxUint32 + 1) % maxExclusive);
      const buffer = new Uint32Array(1);

      while (true) {
        window.crypto.getRandomValues(buffer);
        const candidate = buffer[0];
        if (candidate <= limit) {
          return candidate % maxExclusive;
        }
      }
    }

    return Math.floor(Math.random() * maxExclusive);
  }

  /**
   * Picks a single random character from a non-empty string.
   */
  function pickRandomChar(charString) {
    const index = getUnbiasedRandomInt(charString.length);
    return charString.charAt(index);
  }

  /**
   * Securely shuffles an array in place using the Fisher-Yates algorithm.
   */
  function shuffleArrayInPlace(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = getUnbiasedRandomInt(i + 1);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  /**
   * Clamps an integer value between MIN_LENGTH and MAX_LENGTH.
   */
  function clampLength(rawValue) {
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) {
      return DEFAULT_LENGTH;
    }
    return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, parsed));
  }

  /**
   * Returns an array of currently selected category objects.
   */
  function getSelectedCategories() {
    const selected = [];
    Object.keys(CHAR_CATEGORIES).forEach(function (key) {
      const checkbox = checkboxes[key];
      if (checkbox && checkbox.checked) {
        selected.push(CHAR_CATEGORIES[key]);
      }
    });
    return selected;
  }

  /**
   * Updates the visual active state on checkbox label containers.
   */
  function syncCheckboxStyles() {
    Object.keys(checkboxes).forEach(function (key) {
      const checkbox = checkboxes[key];
      if (!checkbox) return;
      const optionLabel = checkbox.closest(".charset-option");
      if (optionLabel) {
        optionLabel.classList.toggle("is-active", checkbox.checked);
      }
    });
  }

  /**
   * Validates that at least one character category is enabled.
   */
  function validateControls() {
    const selected = getSelectedCategories();
    const isValid = selected.length > 0;

    validationError.hidden = isValid;
    generateBtn.disabled = !isValid;
    regenerateBtn.disabled = !isValid;

    return isValid;
  }

  /**
   * Heuristic strength estimator based on length and character variety.
   * Returns level (1..4) and label ("Weak", "Fair", "Strong", "Very strong").
   */
  function evaluateStrength(password, activeCategoryCount) {
    const length = password.length;

    let presentCategories = 0;
    if (/[A-Z]/.test(password)) presentCategories += 1;
    if (/[a-z]/.test(password)) presentCategories += 1;
    if (/[0-9]/.test(password)) presentCategories += 1;
    if (/[^A-Za-z0-9]/.test(password)) presentCategories += 1;

    const varietyCount = Math.max(1, Math.min(activeCategoryCount, presentCategories));

    let points = 0;
    if (length >= 8) points += 1;
    if (length >= 12) points += 1;
    if (length >= 16) points += 1;
    if (length >= 24) points += 1;

    if (varietyCount >= 2) points += 1;
    if (varietyCount >= 3) points += 1;
    if (varietyCount === 4) points += 1;

    if (length < 8 || points <= 2) {
      return { level: 1, text: "Weak" };
    }
    if (length < 12 || points <= 4) {
      return { level: 2, text: "Fair" };
    }
    if (length < 16 || varietyCount < 3 || points <= 5) {
      return { level: 3, text: "Strong" };
    }
    return { level: 4, text: "Very strong" };
  }

  /**
   * Updates the strength meter UI.
   */
  function renderStrength(password, selectedCategories) {
    if (!password) {
      strengthMeter.removeAttribute("data-level");
      strengthMeter.setAttribute("aria-valuenow", "0");
      strengthMeter.setAttribute("aria-valuetext", "Not generated");
      strengthLabel.removeAttribute("data-level");
      strengthLabel.textContent = "Not generated";
      return;
    }

    const result = evaluateStrength(password, selectedCategories.length);
    strengthMeter.setAttribute("data-level", String(result.level));
    strengthMeter.setAttribute("aria-valuenow", String(result.level));
    strengthMeter.setAttribute("aria-valuetext", result.text);
    strengthLabel.setAttribute("data-level", String(result.level));
    strengthLabel.textContent = result.text;
  }

  /**
   * Resets temporary copy feedback state.
   */
  function clearCopyFeedback() {
    if (copyFeedbackTimer) {
      window.clearTimeout(copyFeedbackTimer);
      copyFeedbackTimer = null;
    }
    copyBtn.classList.remove("is-copied");
    copyBtnLabel.textContent = "Copy";
    feedbackMessage.textContent = "";
    feedbackMessage.classList.remove("is-error");
  }

  /**
   * Generates a new password according to the current controls.
   */
  function generatePassword() {
    clearCopyFeedback();

    if (!validateControls()) {
      return;
    }

    const length = clampLength(lengthSlider.value);
    lengthSlider.value = String(length);
    lengthNumber.value = String(length);
    lengthSlider.setAttribute("aria-valuenow", String(length));

    const selectedCategories = getSelectedCategories();
    const combinedPool = selectedCategories
      .map(function (cat) {
        return cat.chars;
      })
      .join("");

    const passwordChars = [];

    if (length >= selectedCategories.length) {
      selectedCategories.forEach(function (cat) {
        passwordChars.push(pickRandomChar(cat.chars));
      });

      for (let i = passwordChars.length; i < length; i += 1) {
        passwordChars.push(pickRandomChar(combinedPool));
      }
    } else {
      for (let i = 0; i < length; i += 1) {
        passwordChars.push(pickRandomChar(combinedPool));
      }
    }

    shuffleArrayInPlace(passwordChars);

    currentPassword = passwordChars.join("");

    passwordDisplayBox.classList.remove("is-empty");
    passwordOutput.textContent = currentPassword;
    outputStatus.textContent = length + " chars";
    copyBtn.disabled = false;

    renderStrength(currentPassword, selectedCategories);
  }

  /**
   * Copies the currently generated password to the clipboard.
   */
  async function copyPasswordToClipboard() {
    if (!currentPassword) {
      return;
    }

    clearCopyFeedback();

    let copySucceeded = false;

    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(currentPassword);
        copySucceeded = true;
      } catch (_err) {
        copySucceeded = false;
      }
    }

    if (!copySucceeded) {
      try {
        const tempTextarea = document.createElement("textarea");
        tempTextarea.value = currentPassword;
        tempTextarea.setAttribute("readonly", "");
        tempTextarea.style.position = "fixed";
        tempTextarea.style.top = "-9999px";
        tempTextarea.style.opacity = "0";
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        copySucceeded = document.execCommand("copy");
        document.body.removeChild(tempTextarea);
      } catch (_fallbackErr) {
        copySucceeded = false;
      }
    }

    if (copySucceeded) {
      copyBtn.classList.add("is-copied");
      copyBtnLabel.textContent = "Copied";
      feedbackMessage.classList.remove("is-error");
      feedbackMessage.textContent = "Copied to clipboard.";

      copyFeedbackTimer = window.setTimeout(function () {
        copyBtn.classList.remove("is-copied");
        copyBtnLabel.textContent = "Copy";
        feedbackMessage.textContent = "";
      }, 2200);
    } else {
      feedbackMessage.classList.add("is-error");
      feedbackMessage.textContent =
        "Clipboard access denied. Select the password text to copy manually.";
    }
  }

  /**
   * Synchronizes the range slider and numeric input controls.
   */
  function handleSliderInput() {
    const length = clampLength(lengthSlider.value);
    lengthNumber.value = String(length);
    lengthSlider.setAttribute("aria-valuenow", String(length));
  }

  function handleNumberInput() {
    const raw = lengthNumber.value.trim();
    if (raw === "") {
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= MIN_LENGTH && parsed <= MAX_LENGTH) {
      lengthSlider.value = String(parsed);
      lengthSlider.setAttribute("aria-valuenow", String(parsed));
    }
  }

  function handleNumberBlur() {
    const clamped = clampLength(lengthNumber.value);
    lengthNumber.value = String(clamped);
    lengthSlider.value = String(clamped);
    lengthSlider.setAttribute("aria-valuenow", String(clamped));
  }

  /**
   * Initializes event listeners and initial UI state.
   */
  function init() {
    if (!isWebCryptoAvailable()) {
      cryptoWarning.hidden = false;
    }

    lengthSlider.addEventListener("input", handleSliderInput);
    lengthNumber.addEventListener("input", handleNumberInput);
    lengthNumber.addEventListener("blur", handleNumberBlur);
    lengthNumber.addEventListener("change", handleNumberBlur);

    Object.keys(checkboxes).forEach(function (key) {
      const checkbox = checkboxes[key];
      if (!checkbox) return;
      checkbox.addEventListener("change", function () {
        syncCheckboxStyles();
        validateControls();
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      generatePassword();
    });

    regenerateBtn.addEventListener("click", function () {
      generatePassword();
    });

    copyBtn.addEventListener("click", function () {
      copyPasswordToClipboard();
    });

    syncCheckboxStyles();
    validateControls();
    renderStrength("", getSelectedCategories());
  }

  init();
})();
