// Prueba una página sin internet, en escritorio y celular, y guarda capturas.
// Uso: node probar_pagina.mjs ruta/pagina.html [carpeta-capturas]
// Requiere Playwright (npm i -g playwright, o el global del entorno). En contenedores sin GPU
// usa SwiftShader para que WebGL (Three.js) funcione.
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { execSync } from "child_process";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); }
catch { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }

const pagina = path.resolve(process.argv[2] || "index.html");
const dir = path.resolve(process.argv[3] || "capturas");
fs.mkdirSync(dir, { recursive: true });

const navegador = await pw.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let problemas = 0;
for (const [nombre, ancho, alto] of [["escritorio", 1280, 860], ["celular", 390, 844]]) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto } });
  await ctx.route(/^https?:/, r => r.abort());          // sin internet: lo que dependa de CDN falla acá
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", e => errores.push("JS: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push("consola: " + m.text()); });
  p.on("requestfailed", r => { if (!/^https?:/.test(r.url())) errores.push("no cargó: " + r.url().slice(0, 100)); });
  await p.goto("file://" + pagina);
  await p.waitForTimeout(2500);
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; document.querySelectorAll("img").forEach(i => i.loading = "eager"); });
  await p.screenshot({ path: path.join(dir, `${nombre}-inicio.png`) });

  // Recorre la página de a una pantalla para disparar animaciones y capturar cada tramo
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = alto, i = 1; y < total && i <= 30; y += alto, i++) {
    await p.evaluate(v => window.scrollTo(0, v), y);
    await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(dir, `${nombre}-${String(i).padStart(2, "0")}.png`) });
  }
  const rotas = await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => (i.getAttribute("src") || "").slice(0, 60)));
  const anchoDoc = await p.evaluate(() => document.documentElement.scrollWidth);
  const webgl = await p.evaluate(() => document.querySelectorAll("canvas").length);
  console.log(`\n[${nombre}] canvas: ${webgl} · ancho documento: ${anchoDoc}px (ventana ${ancho}px)`);
  if (anchoDoc > ancho) { console.log("  ✗ la página se desplaza de costado"); problemas++; }
  if (rotas.length) { console.log("  ✗ imágenes rotas:", rotas); problemas++; }
  if (errores.length) { console.log("  ✗ errores:\n   " + errores.join("\n   ")); problemas++; }
  if (anchoDoc <= ancho && !rotas.length && !errores.length) console.log("  ✓ sin problemas");
  await ctx.close();
}
await navegador.close();
console.log(`\nCapturas en ${dir}. Miralas antes de entregar.`);
process.exit(problemas ? 1 : 0);
