// ================================================
// CLOUDFLARE WORKER — Vice & Coni 💕
// Envía notificaciones push via FCM API V1
// ================================================

const PROJECT_ID    = "appamorvicente";
const CLIENT_EMAIL  = "firebase-adminsdk-fbsvc@appamorvicente.iam.gserviceaccount.com";

// Clave privada almacenada como variable de entorno en Cloudflare
// (se configura en el dashboard, NO va hardcodeada aquí)
// Nombre de la variable: FIREBASE_PRIVATE_KEY

// ================================================
// ENTRY POINT
// ================================================
export default {
  async fetch(request, env) {
    // CORS para que la app pueda llamar al worker
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    if (request.method !== "POST") {
      return corsResponse({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse({ error: "Invalid JSON" }, 400);
    }

    const { token, title, message, url } = body;
    if (!token || !title) {
      return corsResponse({ error: "Missing token or title" }, 400);
    }

    try {
      const accessToken = await getAccessToken(env.FIREBASE_PRIVATE_KEY);
      const result = await sendFCM(accessToken, token, title, message, url);
      return corsResponse({ ok: true, result });
    } catch (err) {
      return corsResponse({ error: err.message }, 500);
    }
  }
};

// ================================================
// GENERAR ACCESS TOKEN (OAuth2 con JWT)
// ================================================
async function getAccessToken(privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);

  const header  = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const encode = obj => btoa(JSON.stringify(obj))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Importar la clave privada RSA
  const pemContent = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  const keyBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${sigB64}`;

  // Intercambiar JWT por access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("No se pudo obtener access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

// ================================================
// ENVIAR NOTIFICACIÓN VIA FCM V1
// ================================================
async function sendFCM(accessToken, token, title, body, url) {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

  const payload = {
    message: {
      token,
      // Solo "data", sin "notification", para evitar notificación duplicada.
      // El sw.js se encarga de mostrarla via onBackgroundMessage.
      data: {
        title,
        body: body || "",
        url: url || "/"
      },
      webpush: {
        headers: { Urgency: "high" },
        fcm_options: { link: url || "/" }
      }
    }
  };

  const res = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// ================================================
// HELPER CORS
// ================================================
function corsResponse(body, status = 200) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
