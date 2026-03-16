const PRIVYR_WEBHOOK_URL = (
  process.env.PRIVYR_WEBHOOK_URL ||
  "https://www.privyr.com/api/v1/incoming-leads/0vZfjMQw/cgVVSiYW#generic-webhook"
).split("#")[0];

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

const parseBody = (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      const params = new URLSearchParams(req.body);
      return Object.fromEntries(params.entries());
    }
  }

  return {};
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  }

  const body = parseBody(req);
  const lead = {
    name: cleanText(body.name),
    phone: cleanText(body.phone),
    pincode: cleanText(body.pincode),
    whatsapp: cleanText(body.whatsapp),
    batchPreference: cleanText(body.batchPreference),
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
    return res.status(400).json({
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const privyrResponse = await fetch(PRIVYR_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(privyrPayload),
      signal: controller.signal,
    });

    const responseText = await privyrResponse.text();

    if (!privyrResponse.ok) {
      throw new Error(
        `Privyr returned ${privyrResponse.status}: ${responseText.slice(0, 200)}`
      );
    }

    return res.json({
      success: true,
      message: "Thanks! Your inquiry has been submitted. Our team will contact you shortly.",
    });
  } catch (error) {
    console.error("Privyr lead submission failed:", error.message);

    return res.status(502).json({
      success: false,
      message: "We could not submit your inquiry right now. Please call or WhatsApp us at 7709110967.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
