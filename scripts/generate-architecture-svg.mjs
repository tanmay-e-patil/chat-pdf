import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const outputPath = path.join(process.cwd(), "public", "architecture.svg");

const iconUrls = {
  s3: "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/storage/simple-storage-service-s3-bucket.png",
  lambda: "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/compute/lambda.png",
  bedrock: "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/ml/bedrock.png",
};

async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
          response.resume();
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function arrow(x1, y1, x2, y2, label = "") {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelMarkup = label
    ? `<text x="${midX}" y="${midY - 8}" class="edge-label" text-anchor="middle">${escapeXml(label)}</text>`
    : "";

  return `
    <path d="M ${x1} ${y1} L ${x2} ${y2}" class="edge" marker-end="url(#arrowhead)" />
    ${labelMarkup}`;
}

function node({ id, x, y, title, subtitle, color = "#4B5563", icon, iconText }) {
  const titleLines = wrapText(title, 18);
  const subtitleLines = subtitle ? wrapText(subtitle, 22) : [];
  const titleStart = y + 88 - (titleLines.length - 1) * 9;
  const subtitleStart = titleStart + titleLines.length * 18 + 4;
  const iconMarkup = icon
    ? `<image href="${icon}" x="${x + 52}" y="${y + 16}" width="48" height="48" preserveAspectRatio="xMidYMid meet" />`
    : `<circle cx="${x + 76}" cy="${y + 40}" r="24" fill="${color}" /><text x="${x + 76}" y="${y + 48}" class="icon-text" text-anchor="middle">${escapeXml(iconText)}</text>`;

  return `
    <g id="${id}" class="node">
      <rect x="${x}" y="${y}" width="152" height="132" rx="12" fill="#FFFFFF" stroke="#CBD5E1" />
      <rect x="${x}" y="${y}" width="152" height="6" rx="3" fill="${color}" />
      ${iconMarkup}
      ${titleLines
        .map(
          (line, index) =>
            `<text x="${x + 76}" y="${titleStart + index * 18}" class="node-title" text-anchor="middle">${escapeXml(line)}</text>`,
        )
        .join("")}
      ${subtitleLines
        .map(
          (line, index) =>
            `<text x="${x + 76}" y="${subtitleStart + index * 15}" class="node-subtitle" text-anchor="middle">${escapeXml(line)}</text>`,
        )
        .join("")}
    </g>`;
}

function group({ x, y, width, height, title, color }) {
  return `
    <g class="group">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="${color}" stroke="#CBD5E1" />
      <text x="${x + 18}" y="${y + 30}" class="group-title">${escapeXml(title)}</text>
    </g>`;
}

async function main() {
  const icons = Object.fromEntries(
    await Promise.all(
      Object.entries(iconUrls).map(async ([name, url]) => {
        const buffer = await fetchBuffer(url);
        return [name, `data:image/png;base64,${buffer.toString("base64")}`];
      }),
    ),
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="760" viewBox="0 0 1240 760" role="img" aria-labelledby="title desc">
  <title id="title">Chat PDF architecture</title>
  <desc id="desc">Architecture diagram showing user browser, Next.js API routes, Clerk, Stripe, AWS S3, Lambda ingestion, Amazon Bedrock, Pinecone, and Neon Postgres.</desc>
  <defs>
    <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
      <path d="M 0 0 L 12 4 L 0 8 z" fill="#334155" />
    </marker>
    <filter id="shadow" x="-8%" y="-8%" width="116%" height="116%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0F172A" flood-opacity="0.12" />
    </filter>
  </defs>
  <style>
    .background { fill: #F8FAFC; }
    .title { fill: #0F172A; font: 700 30px Arial, sans-serif; }
    .caption { fill: #475569; font: 400 15px Arial, sans-serif; }
    .group-title { fill: #334155; font: 700 16px Arial, sans-serif; }
    .node { filter: url(#shadow); }
    .node-title { fill: #111827; font: 700 14px Arial, sans-serif; }
    .node-subtitle { fill: #64748B; font: 400 12px Arial, sans-serif; }
    .icon-text { fill: #FFFFFF; font: 700 18px Arial, sans-serif; }
    .edge { fill: none; stroke: #334155; stroke-width: 2.4; stroke-linecap: round; }
    .edge-label { fill: #475569; font: 600 12px Arial, sans-serif; paint-order: stroke; stroke: #F8FAFC; stroke-width: 5px; stroke-linejoin: round; }
  </style>

  <rect class="background" width="1240" height="760" />
  <text x="56" y="54" class="title">Chat PDF Architecture</text>
  <text x="56" y="82" class="caption">PDF upload, ingestion, vector retrieval, and Bedrock-powered chat flow</text>

  ${group({ x: 40, y: 120, width: 200, height: 540, title: "Client", color: "#EFF6FF" })}
  ${group({ x: 280, y: 120, width: 220, height: 540, title: "Application", color: "#F8FAFC" })}
  ${group({ x: 540, y: 120, width: 400, height: 540, title: "AWS", color: "#FFF7ED" })}
  ${group({ x: 980, y: 120, width: 220, height: 540, title: "Data and SaaS", color: "#F0FDFA" })}

  ${node({ id: "user", x: 64, y: 308, title: "User browser", subtitle: "Uploads PDFs and chats", color: "#2563EB", iconText: "U" })}
  ${node({ id: "next", x: 314, y: 308, title: "Next.js app", subtitle: "UI and API routes", color: "#111827", iconText: "N" })}
  ${node({ id: "s3", x: 570, y: 164, title: "S3 PDF bucket", subtitle: "Presigned upload", color: "#569A31", icon: icons.s3 })}
  ${node({ id: "lambda", x: 570, y: 452, title: "Lambda ingestion", subtitle: "Parse and chunk PDFs", color: "#FF9900", icon: icons.lambda })}
  ${node({ id: "embed", x: 758, y: 308, title: "Bedrock embeddings", subtitle: "Vectorize chunks", color: "#8C4FFF", icon: icons.bedrock })}
  ${node({ id: "chat", x: 758, y: 504, title: "Bedrock chat", subtitle: "Generate answers", color: "#8C4FFF", icon: icons.bedrock })}
  ${node({ id: "clerk", x: 1014, y: 164, title: "Clerk auth", subtitle: "Sessions and users", color: "#6C47FF", iconText: "C" })}
  ${node({ id: "stripe", x: 1014, y: 324, title: "Stripe", subtitle: "Checkout and webhooks", color: "#635BFF", iconText: "$" })}
  ${node({ id: "pinecone", x: 1014, y: 484, title: "Pinecone", subtitle: "Vector index", color: "#059669", iconText: "P" })}
  ${node({ id: "db", x: 806, y: 164, title: "Neon Postgres", subtitle: "Chats and messages", color: "#00E599", iconText: "DB" })}

  ${arrow(216, 374, 314, 374, "app requests")}
  ${arrow(466, 346, 570, 230, "presigned upload")}
  ${arrow(466, 398, 570, 518, "invoke ingestion")}
  ${arrow(722, 518, 758, 374, "embed chunks")}
  ${arrow(722, 552, 1014, 552, "store vectors")}
  ${arrow(722, 518, 806, 230, "status")}
  ${arrow(466, 332, 1014, 230, "auth")}
  ${arrow(466, 374, 1014, 390, "billing")}
  ${arrow(466, 416, 1014, 552, "retrieve context")}
  ${arrow(466, 458, 758, 570, "chat completion")}
  ${arrow(466, 488, 806, 230, "save messages")}
</svg>
`;

  await fs.writeFile(outputPath, svg);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
