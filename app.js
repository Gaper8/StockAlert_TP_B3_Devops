// app.js — StockAlert API
// Gestionnaire d'alertes de stock pour une boutique en ligne

const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const APP_ENV = process.env.APP_ENV || "development";
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const DEFAULT_THRESHOLD = parseInt(process.env.DEFAULT_THRESHOLD || "10");

// ── DONNÉES EN MÉMOIRE ───────────────────────────────────────────────
// Produits avec leur stock actuel
const products = new Map([
  ["prod-001", { id: "prod-001", name: "Laptop Pro 15", stock: 3, threshold: 5 }],
  ["prod-002", { id: "prod-002", name: "Mechanical Keyboard", stock: 12, threshold: 10 }],
  ["prod-003", { id: "prod-003", name: "USB-C Hub", stock: 0, threshold: 5 }],
  ["prod-004", { id: "prod-004", name: "Monitor 27\"", stock: 8, threshold: 10 }],
]);

// Alertes générées automatiquement quand stock < threshold
const alerts = new Map();

function genId() {
  return crypto.randomBytes(4).toString("hex");
}

// Vérifier et générer une alerte si nécessaire
function checkAndAlert(product) {
  if (product.stock < product.threshold) {
    const alertId = genId();
    const alert = {
      id: alertId,
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      threshold: product.threshold,
      severity: product.stock === 0 ? "critical" : "warning",
      createdAt: new Date().toISOString(),
      resolved: false
    };
    alerts.set(alertId, alert);
    return alert;
  }
  return null;
}

// Initialiser les alertes au démarrage
products.forEach(product => checkAndAlert(product));

// ── UTILITAIRES ──────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("JSON invalide")); }
    });
  });
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-App-Version": APP_VERSION,
    "X-App-Env": APP_ENV
  });
  res.end(JSON.stringify(data, null, 2));
}

// ── LOGIQUE MÉTIER ───────────────────────────────────────────────────
function getAlertStats() {
  const all = Array.from(alerts.values());
  return {
    total: all.length,
    active: all.filter(a => !a.resolved).length,
    critical: all.filter(a => a.severity === "critical" && !a.resolved).length,
    warning: all.filter(a => a.severity === "warning" && !a.resolved).length,
    resolved: all.filter(a => a.resolved).length
  };
}

function isValidSeverity(s) {
  return ["critical", "warning"].includes(s);
}

function isValidStock(n) {
  return Number.isInteger(n) && n >= 0;
}

// ── SERVEUR ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
    return;
  }

  const url = req.url.split("?")[0];

  // GET /health
  if (req.method === "GET" && url === "/health") {
    json(res, 200, {
      status: "ok",
      env: APP_ENV,
      version: APP_VERSION,
      products: products.size,
      alerts: getAlertStats()
    });
    return;
  }

  // GET /products — liste tous les produits
  if (req.method === "GET" && url === "/products") {
    const list = Array.from(products.values()).map(p => ({
      ...p,
      belowThreshold: p.stock < p.threshold
    }));
    json(res, 200, { total: list.length, products: list });
    return;
  }

  // POST /products — ajouter un produit
  if (req.method === "POST" && url === "/products") {
    try {
      const { name, stock, threshold } = await parseBody(req);
      if (!name?.trim()) { json(res, 400, { error: "name est requis" }); return; }
      if (!isValidStock(stock)) { json(res, 400, { error: "stock doit être un entier >= 0" }); return; }
      const id = `prod-${genId()}`;
      const product = { id, name: name.trim(), stock, threshold: threshold ?? DEFAULT_THRESHOLD };
      products.set(id, product);
      const alert = checkAndAlert(product);
      json(res, 201, { product, alertCreated: alert !== null });
    } catch (e) { json(res, 400, { error: e.message }); }
    return;
  }

  // PATCH /products/:id/stock — mettre à jour le stock
  const stockMatch = url.match(/^\/products\/([^/]+)\/stock$/);
  if (req.method === "PATCH" && stockMatch) {
    try {
      const product = products.get(stockMatch[1]);
      if (!product) { json(res, 404, { error: "Produit introuvable" }); return; }
      const { stock } = await parseBody(req);
      if (!isValidStock(stock)) { json(res, 400, { error: "stock doit être un entier >= 0" }); return; }
      product.stock = stock;
      const alert = checkAndAlert(product);
      json(res, 200, { product, alertCreated: alert !== null });
    } catch (e) { json(res, 400, { error: e.message }); }
    return;
  }

  // GET /alerts — liste toutes les alertes
  if (req.method === "GET" && url === "/alerts") {
    const list = Array.from(alerts.values()).sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    json(res, 200, { ...getAlertStats(), alerts: list });
    return;
  }

  // GET /alerts/active — alertes non résolues uniquement
  if (req.method === "GET" && url === "/alerts/active") {
    const active = Array.from(alerts.values()).filter(a => !a.resolved);
    json(res, 200, { total: active.length, alerts: active });
    return;
  }

  // PATCH /alerts/:id/resolve — résoudre une alerte
  const resolveMatch = url.match(/^\/alerts\/([^/]+)\/resolve$/);
  if (req.method === "PATCH" && resolveMatch) {
    const alert = alerts.get(resolveMatch[1]);
    if (!alert) { json(res, 404, { error: "Alerte introuvable" }); return; }
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    json(res, 200, { alert });
    return;
  }

  // DELETE /alerts/:id — supprimer une alerte
  const alertMatch = url.match(/^\/alerts\/([^/]+)$/);
  if (req.method === "DELETE" && alertMatch) {
    if (!alerts.has(alertMatch[1])) { json(res, 404, { error: "Alerte introuvable" }); return; }
    alerts.delete(alertMatch[1]);
    json(res, 200, { message: "Alerte supprimée" });
    return;
  }

  json(res, 404, { error: "Route introuvable" });
});

server.listen(PORT, () => {
  console.log(`StockAlert API — env: ${APP_ENV}, version: ${APP_VERSION}, port: ${PORT}`);
});

module.exports = { server, products, alerts, genId, checkAndAlert, isValidSeverity, isValidStock, getAlertStats };
