const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PRIVYR_WEBHOOK_URL = (
  process.env.PRIVYR_WEBHOOK_URL ||
  "https://www.privyr.com/api/v1/incoming-leads/0vZfjMQw/cgVVSiYW#generic-webhook"
).split("#")[0];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sendRootFile = (response, filename, contentType) => {
  if (contentType) {
    response.type(contentType);
  }

  response.sendFile(path.join(__dirname, filename));
};

const cleanText = (value) => String(value || "").trim();

const normalizePhone = (value) => {
  const rawValue = cleanText(value);
  const digits = rawValue.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (rawValue.startsWith("+")) {
    return `+${digits}`;
  }

  return digits;
};

const hasValidPhoneLength = (value) => {
  const digits = cleanText(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
};

app.get("/", (_request, response) => {
  sendRootFile(response, "index.html", "html");
});

app.get("/styles.css", (_request, response) => {
  sendRootFile(response, "styles.css", "css");
});

app.get("/main.js", (_request, response) => {
  sendRootFile(response, "main.js", "application/javascript");
});

app.get("/health", (_request, response) => {
  response.json({ success: true, status: "ok" });
});

app.post("/api/leads", async (request, response) => {
  const lead = {
    name: cleanText(request.body.name),
    phone: cleanText(request.body.phone),
    pincode: cleanText(request.body.pincode),
    whatsapp: cleanText(request.body.whatsapp),
    batchPreference: cleanText(request.body.batchPreference),
  };

  const validationErrors = [];

  if (lead.name.length < 2) {
    validationErrors.push("Please enter your full name.");
  }

  if (!hasValidPhoneLength(lead.phone)) {
    validationErrors.push("Please enter a valid phone number.");
  }

  if (!hasValidPhoneLength(lead.whatsapp)) {
    validationErrors.push("Please enter a valid WhatsApp number.");
  }

  if (!/^\d{6}$/.test(lead.pincode)) {
    validationErrors.push("Please enter a valid 6-digit pincode.");
  }

  if (!["Online Batch", "Offline Batch"].includes(lead.batchPreference)) {
    validationErrors.push("Please select your batch preference.");
  }

  if (validationErrors.length > 0) {
    return response.status(400).json({
      success: false,
      message: validationErrors[0],
      errors: validationErrors,
    });
  }

  const privyrPayload = {
    name: lead.name,
    phone: normalizePhone(lead.phone),
    other_fields: {
      "WhatsApp Number": normalizePhone(lead.whatsapp),
      "Location (Pincode)": lead.pincode,
      "Batch Preference": lead.batchPreference,
      "Lead Source": "PIDL Landing Page",
      Course: "Digital Marketing Batch 3",
    },
  };

  try {
    const privyrResponse = await fetch(PRIVYR_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(privyrPayload),
      signal: AbortSignal.timeout(12000),
    });

    const responseText = await privyrResponse.text();

    if (!privyrResponse.ok) {
      throw new Error(`Privyr returned ${privyrResponse.status}: ${responseText.slice(0, 200)}`);
    }

    return response.json({
      success: true,
      message: "Thanks! Your inquiry has been submitted. Our team will contact you shortly.",
    });
  } catch (error) {
    console.error("Privyr lead submission failed:", error.message);

    return response.status(502).json({
      success: false,
      message: "We could not submit your inquiry right now. Please call or WhatsApp us at 7709110967.",
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PIDL app running on http://localhost:${PORT}`);
  });
}

module.exports = app;
