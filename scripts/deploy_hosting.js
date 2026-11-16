#!/usr/bin/env node
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT_DIR = path.dirname(__dirname);
const sa = {
  client_email: "firebase-adminsdk-fbsvc@lab-x-studio.iam.gserviceaccount.com",
  private_key_id: "f44ce19a0f207a54c94c0f776117dd0d22381ab0",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3EDDVdgjHYxyz\nQve3Pzjof8iwpWuz4IffDoXoV7hE1DvmOGKpml79dZFR60K6Og/NYs4+RsGvoX7P\niWyyPvpwziOyn2rXmzdUtDxWVdGfNTJSbyf3qOmn7QR0qT4KabboiV6mwuDfkTe/\nfMLUERhifG85F34kxbjaDVQawIO66H+TRbAmWdqpCOB8+NJV45QoER7iqWmE6cOC\nLttv7pEEvBr8wTEtNH8KNeb7PSVQl085JeJ6jpAfk4mJt1glNb62SnfQCCUC6J8K\nzlW/oAaAC4PiMq3BtVeq2UqGQaZ/poBhEMeXQOS2svIorW3kEUGQ05VVhYSfRxd8\nFuF3oF8zAgMBAAECggEAGlQazJNK/0ToRiP14AYYwjT2q+lEDJKDbXeiQgteYOUs\nBELMddt87p6FGwS8tm9OrIRvEz02nXLwURr7u3BxW94EplZlQG3Tebw+XVBpyKhs\nUgzTRmb7IVVmaaeZrle2oHUkBtSfu6fKySCWyMyjTC7ctEJbuHWIzjD9N/0Y372o\nU1TRPdrprk8S+KPfipWCpDEItlbFiQNnUQSiLp3r9ZprgiieR97N6pC5WM2b6+aU\nEvcgH3ewxEZ13HEjNVLmiSdx8ic8/i1ZbCuIke2yEEnH2XGyw/3qa0aUFy/9GxSw\nr1/0ca7C5Qig8yLyXFvSGgs/d6E04Uxmllw73vdWwQKBgQDeTXu9l9CQtxc2elV9\nKTF24lV3lgQoIcY8zT0QoxMEe3VjzrjSRXfb+M8tZyoXkcsj5tvU/2tWDh+EhyEX\nb9OGVloXGNId1zBzZFRXXQkbY2LzRGJ8zqaSKr94mAzxnjkB68HfAVYoXAo78v/n\nHVJYiZFsHp6+fWI2NFW2W1UnUwKBgQDS0AK7d6LlJhRbluGBfLLE5KeA5O1JbrOV\nEm4f6+qpT7t0agaDDQHIZMq4jyaP3Q7khyxWXK2nhf/H1vM4s7Jhw9MRzxtTbKiQ\nf7rJP3JMTKwcLQoiueBvQzevm1Ry0RniVRjra4q8r4T6licNriScjL+yvMEUjnHJ\n3/2VdEJMoQKBgQC66C7IA6LqaeZseYLzTvU13aq6dzlbfLouWOmk2VeeByd2GVMw\nCBR0sMeQhxLO6lgAAZSHi5F1sz4wsWTTTcRtSKFKliXjzRABlTOMmL6VdoS1wKOG\nCEHo12RRQpZvd/a6dLx2gastF+XK7c7XRMH9ivzoCP6zbrxqkqoWPshj3QKBgQCx\n+s/zueObFvUlBlNI4SCEvo70cVIsJvwSpUa4SJMLcrdOZ50r0zVoHEBSZPkniHhk\nVAMIvqIVxznVXBJoEr5Nb+ipJnNpkVkW9d+avKgg5rJ/7z6ZZtim1tcSuU8oyITT\n4whw6ZBuELlyXoaGNDnQubu2iUlxs3k5+JO9NDQtQQKBgFdK7oQP4a+5vk7YNQ5t\ngSxYM7fU7Cja3YclxNsYHYAAdI5wOFO7geRqMWl//t74aAZ87v7aNlgqHgHcrzPa\nfvGDEP+zpXXuPqCx7HavDS24snYBU8lIm+1iAvj+QQnW7d+h22B4qkvo+eTf8hsB\nopKLMgDUXiBBWMhHlTdiGghN\n-----END PRIVATE KEY-----\n",
  project_id: "lab-x-studio"
};

function base64url(str) { return Buffer.from(str).toString("base64url"); }

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/firebase.hosting",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const tokenInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(tokenInput);
  const signature = signer.sign(sa.private_key, "base64url");
  const jwt = `${tokenInput}.${signature}`;
  const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

  return new Promise((resolve, reject) => {
    const req = https.request("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(postData) }
    }, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => resolve(JSON.parse(body).access_token));
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function deploy() {
  console.log("Authenticating with Firebase Admin Service Account...");
  const token = await getAccessToken();

  console.log("Creating new version on site lab-x-studio...");
  const vRes = await new Promise(res => {
    const req = https.request("https://firebasehosting.googleapis.com/v1beta1/sites/lab-x-studio/versions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    }, r => { let b = ""; r.on("data", c => b += c); r.on("end", () => res(JSON.parse(b))); });
    req.write(JSON.stringify({}));
    req.end();
  });

  const verifyPath = path.join(ROOT_DIR, "verify.html");
  const verifyContent = fs.readFileSync(verifyPath);
  const gzipped = zlib.gzipSync(verifyContent);
  const hash = crypto.createHash("sha256").update(gzipped).digest("hex");

  console.log("Registering verify.html and index.html...");
  const popRes = await new Promise(res => {
    const req = https.request(`https://firebasehosting.googleapis.com/v1beta1/${vRes.name}:populateFiles`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    }, r => { let b = ""; r.on("data", c => b += c); r.on("end", () => res(JSON.parse(b))); });
    req.write(JSON.stringify({ files: { "/verify.html": hash, "/index.html": hash } }));
    req.end();
  });

  if (popRes.uploadRequiredHashes && popRes.uploadRequiredHashes.includes(hash)) {
    console.log("Uploading gzipped asset to Firebase CDN...");
    await new Promise(res => {
      const u = new URL(`${popRes.uploadUrl}/${hash}`);
      const req = https.request(u, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Content-Length": gzipped.length
        }
      }, r => { r.on("data", () => {}); r.on("end", res); });
      req.write(gzipped);
      req.end();
    });
  }

  console.log("Finalizing version...");
  await new Promise(res => {
    const req = https.request(`https://firebasehosting.googleapis.com/v1beta1/${vRes.name}?update_mask=status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    }, r => { r.on("data", () => {}); r.on("end", res); });
    req.write(JSON.stringify({ status: "FINALIZED" }));
    req.end();
  });

  console.log("Releasing to live site...");
  await new Promise(res => {
    const req = https.request(`https://firebasehosting.googleapis.com/v1beta1/sites/lab-x-studio/releases?versionName=${vRes.name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }, r => { r.on("data", () => {}); r.on("end", res); });
    req.end();
  });

  console.log("✅ DEPLOYMENT COMPLETE! Verification portal is live at:");
  console.log("   👉 https://lab-x-studio.web.app/verify.html");
  console.log("   👉 https://lab-x-studio.web.app/");
}

deploy().catch(console.error);
