// app.test.js — tests unitaires StockAlert
const {
  products, alerts, genId,
  checkAndAlert, isValidSeverity, isValidStock, getAlertStats
} = require("./app");

let passed = 0;
let failed = 0;

function test(desc, fn) {
  try { fn(); console.log(`  ✅ ${desc}`); passed++; }
  catch (e) { console.log(`  ❌ ${desc}\n     → ${e.message}`); failed++; }
}

function expect(val) {
  return {
    toBe: (exp) => { if (val !== exp) throw new Error(`Attendu "${exp}", reçu "${val}"`); },
    toEqual: (exp) => { if (JSON.stringify(val) !== JSON.stringify(exp)) throw new Error(`Attendu ${JSON.stringify(exp)}, reçu ${JSON.stringify(val)}`); },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Attendu > ${n}, reçu ${val}`); },
    toBeGreaterThanOrEqual: (n) => { if (val < n) throw new Error(`Attendu >= ${n}, reçu ${val}`); },
    toBeTruthy: () => { if (!val) throw new Error(`Attendu truthy, reçu "${val}"`); },
    toBeFalsy: () => { if (val) throw new Error(`Attendu falsy, reçu "${val}"`); },
    toBeNull: () => { if (val !== null) throw new Error(`Attendu null, reçu "${val}"`); },
    toMatch: (re) => { if (!re.test(String(val))) throw new Error(`"${val}" ne correspond pas à ${re}`); },
    toContain: (s) => { if (!String(val).includes(s)) throw new Error(`"${val}" ne contient pas "${s}"`); },
  };
}

console.log("\n🧪 Tests StockAlert API...\n");

// ── genId ────────────────────────────────────────────────────────────
console.log("genId :");

test("retourne une chaîne de 8 caractères", () => {
  expect(genId().length).toBe(8);
});

test("retourne uniquement des caractères hexadécimaux", () => {
  expect(genId()).toMatch(/^[a-f0-9]{8}$/);
});

test("génère des IDs uniques", () => {
  const ids = new Set(Array.from({ length: 100 }, genId));
  expect(ids.size).toBeGreaterThan(95);
});

// ── isValidStock ─────────────────────────────────────────────────────
console.log("\nisValidStock :");

test("accepte 0", () => {
  expect(isValidStock(0)).toBeTruthy();
});

test("accepte un entier positif", () => {
  expect(isValidStock(42)).toBeTruthy();
});

test("refuse un nombre négatif", () => {
  expect(isValidStock(-1)).toBeFalsy();
});

test("refuse un flottant", () => {
  expect(isValidStock(1.5)).toBeFalsy();
});

test("refuse une chaîne", () => {
  expect(isValidStock("10")).toBeFalsy();
});

test("refuse null", () => {
  expect(isValidStock(null)).toBeFalsy();
});

// ── isValidSeverity ──────────────────────────────────────────────────
console.log("\nisValidSeverity :");

test("accepte 'critical'", () => {
  expect(isValidSeverity("critical")).toBeTruthy();
});

test("accepte 'warning'", () => {
  expect(isValidSeverity("warning")).toBeTruthy();
});

test("refuse 'info'", () => {
  expect(isValidSeverity("info")).toBeFalsy();
});

test("refuse une chaîne vide", () => {
  expect(isValidSeverity("")).toBeFalsy();
});

// ── checkAndAlert ────────────────────────────────────────────────────
console.log("\ncheckAndAlert :");

test("crée une alerte 'critical' si stock = 0", () => {
  const product = { id: "test-001", name: "Test Product", stock: 0, threshold: 5 };
  const alert = checkAndAlert(product);
  expect(alert).toBeTruthy();
  expect(alert.severity).toBe("critical");
  expect(alert.resolved).toBeFalsy();
  // nettoyage
  alerts.delete(alert.id);
});

test("crée une alerte 'warning' si stock < threshold", () => {
  const product = { id: "test-002", name: "Test Product 2", stock: 3, threshold: 5 };
  const alert = checkAndAlert(product);
  expect(alert).toBeTruthy();
  expect(alert.severity).toBe("warning");
  expect(alert.currentStock).toBe(3);
  alerts.delete(alert.id);
});

test("ne crée pas d'alerte si stock >= threshold", () => {
  const product = { id: "test-003", name: "Test Product 3", stock: 10, threshold: 5 };
  const alert = checkAndAlert(product);
  expect(alert).toBeNull();
});

test("l'alerte contient les bonnes propriétés", () => {
  const product = { id: "test-004", name: "Widget XL", stock: 2, threshold: 5 };
  const alert = checkAndAlert(product);
  expect(alert.productId).toBe("test-004");
  expect(alert.productName).toBe("Widget XL");
  expect(alert.threshold).toBe(5);
  expect(typeof alert.createdAt).toBe("string");
  alerts.delete(alert.id);
});

// ── getAlertStats ────────────────────────────────────────────────────
console.log("\ngetAlertStats :");

test("retourne un objet avec les bonnes propriétés", () => {
  const stats = getAlertStats();
  expect(typeof stats.total).toBe("number");
  expect(typeof stats.active).toBe("number");
  expect(typeof stats.critical).toBe("number");
  expect(typeof stats.warning).toBe("number");
  expect(typeof stats.resolved).toBe("number");
});

test("total = active + resolved", () => {
  const stats = getAlertStats();
  expect(stats.total).toBe(stats.active + stats.resolved);
});

test("active = critical + warning", () => {
  const stats = getAlertStats();
  expect(stats.active).toBe(stats.critical + stats.warning);
});

// ── products ─────────────────────────────────────────────────────────
console.log("\nDonnées initiales :");

test("4 produits sont chargés au démarrage", () => {
  expect(products.size).toBe(4);
});

test("chaque produit a les propriétés requises", () => {
  products.forEach(p => {
    if (!p.id || !p.name || p.stock === undefined || p.threshold === undefined) {
      throw new Error(`Produit incomplet : ${JSON.stringify(p)}`);
    }
  });
});

test("des alertes sont générées au démarrage pour les produits sous le seuil", () => {
  const stats = getAlertStats();
  expect(stats.total).toBeGreaterThan(0);
});

// ── RÉSULTAT ─────────────────────────────────────────────────────────
console.log(`\n📊 ${passed} passés, ${failed} échoués\n`);
if (failed > 0) { console.log("❌ Pipeline bloqué.\n"); process.exit(1); }
console.log("✅ Tous les tests passent.\n"); process.exit(0);
