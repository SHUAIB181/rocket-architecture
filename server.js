console.log(__dirname);
const http = require("http");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const ROOT = __dirname;
const PORT = process.env.PORT || 8081;

try {
  fs.readFileSync(path.join(ROOT, ".env"), "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    });
} catch (e) {}

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".md": "text/plain",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".mp4": "video/mp4",
  ".glb": "model/gltf-binary"
};

const { SYSTEM } = require("./js/ai-core.js")

const hits = {};

function send(res, code, body, type) {
  res.writeHead(code, {
    "Content-Type": type || "application/json",
    "X-Content-Type-Options": "nosniff"
  });

  if (Buffer.isBuffer(body)) {
    return res.end(body);
  }

  if (typeof body === "string") {
    return res.end(body);
  }

  return res.end(JSON.stringify(body));
}

async function chat(req, res) {
  const ip = req.socket.remoteAddress;
  const now = Date.now();

  hits[ip] = (hits[ip] || []).filter(
    (t) => now - t < 60000
  );

  if (hits[ip].length >= 20) {
    return send(res, 429, {
      error: "rate_limited"
    });
  }

  hits[ip].push(now);

  if (!process.env.GEMINI_API_KEY) {
    return send(res, 503, {
      error: "missing_gemini_key"
    });
  }

  let raw = "";

  req.on("data", (chunk) => {
    raw += chunk;

    if (raw.length > 60000) {
      req.destroy();
    }
  });

  req.on("end", async () => {
    try {
      const body = JSON.parse(raw);

      const msgs = (body.messages || [])
        .slice(-4)
        .filter(
          (m) =>
            (m.role === "user" ||
              m.role === "assistant") &&
            typeof m.content === "string"
        );

      if (!msgs.length) {
        return send(res, 400, {
          error: "bad_request"
        });
      }

     const context = JSON.stringify(
  body.context?.status || {},
  null,
  2
);

      const prompt = `
${SYSTEM}

CURRENT STATE:
${context}

CONVERSATION:
${msgs
  .map(
    (m) =>
      `${m.role.toUpperCase()}: ${m.content}`
  )
  .join("\n\n")}

ASSISTANT:
`;

      const genAI = new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY
      );

      const model =
  genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite"
  });
      let result;

for (let i = 0; i < 3; i++) {
  try {
    result = await model.generateContent(prompt);
    break;
  } catch (err) {
    console.log("Gemini busy, retrying...");

    if (i === 2) {
      throw err;
    }

    await new Promise(resolve =>
      setTimeout(resolve, 3000)
    );
  }
}

const text = await result.response.text();

      send(res, 200, {
        role: "assistant",
        content: text
      });

    }catch (err) {
  console.error("FULL ERROR:");
  console.error(err);

  send(res, 500, {
    error: "server_error",
    detail: err.message,
    stack: String(err)
  });
}
  });
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(
      (req.url || "/").split("?")[0]
    );

    if (
      req.method === "POST" &&
      url === "/api/chat"
    ) {
      return chat(req, res);
    }

    if (req.method === "GET" && url === "/api/health") {
      return send(res, 200, {
        configured: Boolean(process.env.GEMINI_API_KEY)
      });
    }

    if (req.method !== "GET") {
      return send(res, 405, {
        error: "method_not_allowed"
      });
    }

    let filePath =
      url === "/"
        ? "/index.html"
        : url;

    const file = path.join(
      ROOT,
      path.normalize(filePath)
    );

    if (!file.startsWith(ROOT)) {
      return send(
        res,
        404,
        "Not found",
        "text/plain"
      );
    }

    fs.readFile(file, (err, data) => {
      if (err) {
        return send(
          res,
          404,
          "Not found",
          "text/plain"
        );
      }

      send(
        res,
        200,
        data,
        TYPES[path.extname(file)] ||
          "application/octet-stream"
      );
    });
  })
  .listen(PORT, () => {
    console.log(
      `Mission Architect running at http://localhost:${PORT}`
    );

    console.log(
      process.env.GEMINI_API_KEY
        ? "Gemini AI online"
        : "No Gemini API key found"
    );
  });