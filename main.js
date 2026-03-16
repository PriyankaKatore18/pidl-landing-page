const reveals = document.querySelectorAll("[data-reveal]");

if (reveals.length) {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px",
    },
  );

  reveals.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--reveal-delay", `${Math.min(index * 70, 280)}ms`);
    observer.observe(element);
  });
}

const header = document.querySelector("[data-header]");

if (header) {
  const syncHeader = () => {
    header.classList.toggle("header-scrolled", window.scrollY > 16);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
}

const batchSelect = document.querySelector("#batchPreference");
const batchTriggers = document.querySelectorAll("[data-batch-trigger]");
let lastMetaAdvancedMatchingKey = "";

const normalizeMetaPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return digits;
};

const buildMetaAdvancedMatching = (payload) => {
  const fullName = String(payload.name || "").trim().toLowerCase();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");
  const pincode = String(payload.pincode || "").trim();
  const phone = normalizeMetaPhone(payload.phone);
  const advancedMatching = {};

  if (firstName) {
    advancedMatching.fn = firstName;
  }

  if (lastName) {
    advancedMatching.ln = lastName;
  }

  if (phone) {
    advancedMatching.ph = phone;
  }

  if (/^\d{6}$/.test(pincode)) {
    advancedMatching.zp = pincode;
  }

  return advancedMatching;
};

const applyMetaAdvancedMatching = (payload) => {
  if (typeof window.fbq !== "function" || !window.PIDL_META_PIXEL_ID) {
    return;
  }

  const advancedMatching = buildMetaAdvancedMatching(payload);
  const matchingKeys = Object.keys(advancedMatching);

  if (!matchingKeys.length) {
    return;
  }

  const currentKey = JSON.stringify(advancedMatching);

  if (currentKey === lastMetaAdvancedMatchingKey) {
    return;
  }

  lastMetaAdvancedMatchingKey = currentKey;
  window.fbq("init", window.PIDL_META_PIXEL_ID, advancedMatching);
};

batchTriggers.forEach((button) => {
  button.addEventListener("click", () => {
    if (!batchSelect) {
      return;
    }

    batchSelect.value = button.dataset.batchTrigger;
    document.querySelector("[data-lead-form]")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    batchSelect.focus();
  });
});

const leadForm = document.querySelector("[data-lead-form]");

if (leadForm) {
  const submitButton = leadForm.querySelector('button[type="submit"]');
  const statusBox = leadForm.querySelector("[data-form-status]");
  const defaultButtonLabel = submitButton?.textContent?.trim() || "Submit Inquiry";

  const setStatus = (type, message) => {
    if (!statusBox) {
      return;
    }

    if (!message) {
      statusBox.hidden = true;
      statusBox.textContent = "";
      statusBox.className = "form-status";
      return;
    }

    statusBox.hidden = false;
    statusBox.textContent = message;
    statusBox.className = `form-status ${type === "success" ? "form-status-success" : "form-status-error"}`;
  };

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!leadForm.reportValidity()) {
      return;
    }

    const payload = Object.fromEntries(new FormData(leadForm).entries());

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    setStatus("", "");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || "We could not submit your inquiry right now.");
      }

      applyMetaAdvancedMatching(payload);
      leadForm.reset();
      setStatus("success", result.message || "Your inquiry has been submitted successfully.");

      if (typeof window.fbq === "function") {
        window.fbq("track", "Lead", {
          content_name: "PIDL Digital Marketing Batch 3",
          lead_type: "Admissions Form",
          batch_preference: payload.batchPreference || "",
          pincode: payload.pincode || "",
        });
      }
    } catch (error) {
      setStatus("error", error.message || "We could not submit your inquiry right now.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonLabel;
      }
    }
  });
}
