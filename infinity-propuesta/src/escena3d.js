// Escenas 3D de la propuesta (Three.js). Se empaqueta con esbuild en js/escena3d.js (ver README).
//  - Anatomía: fermentador cónico que se arma con el scroll (GSAP ScrollTrigger).
//  - Configurador: el tanque del buscador, a escala real junto a una persona de 1,75 m.
// Si no hay WebGL, cada escena deja visible su foto de respaldo.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const REDUCIR = matchMedia("(prefers-reduced-motion: reduce)").matches;
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mezclar = (a, b, t) => a + (b - a) * t;

// Interpola por tramos una lista de [progreso, valor] (valor número o array)
function tramo(claves, p) {
  if (p <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [p1, v1] = claves[i], [p0, v0] = claves[i - 1];
    if (p <= p1) {
      const t = suave(p0, p1, p);
      return Array.isArray(v0) ? v0.map((v, k) => mezclar(v, v1[k], t)) : mezclar(v0, v1, t);
    }
  }
  return claves[claves.length - 1][1];
}

// ---------- Materiales ----------
function materiales() {
  return {
    pe: new THREE.MeshPhysicalMaterial({ color: 0xf2f4f1, roughness: .38, transmission: .78, thickness: .25, ior: 1.46, clearcoat: .5, clearcoatRoughness: .25, side: THREE.DoubleSide }),
    acero: new THREE.MeshStandardMaterial({ color: 0xd3d8dc, metalness: 1, roughness: .26 }),
    verde: new THREE.MeshPhysicalMaterial({ color: 0x12a150, roughness: .32, clearcoat: .6 }),
    junta: new THREE.MeshStandardMaterial({ color: 0x34d27b, roughness: .5 }),
    cerveza: new THREE.MeshStandardMaterial({ color: 0xc46a05, roughness: .12, emissive: 0x7a3a00, emissiveIntensity: .35 }),
    agua: new THREE.MeshStandardMaterial({ color: 0x7cc4e8, roughness: .1, emissive: 0x0d4a70, emissiveIntensity: .2 }),
    persona: new THREE.MeshStandardMaterial({ color: 0xc7c7cc, roughness: .8 }),
    jaula: new THREE.MeshStandardMaterial({ color: 0x9aa3a8, metalness: .8, roughness: .35 }),
    pallet: new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: .7 })
  };
}

// ---------- Motor común ----------
function motor(lienzo, { sombraOpacidad = .14, desplazar = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  lienzo.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e8ed, .6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(4, 8, 5); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, far: 30 }); sol.shadow.radius = 6;
  scene.add(sol);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: sombraOpacidad }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; scene.add(piso);

  const camera = new THREE.PerspectiveCamera(30, 1, .05, 200);
  function ajustar() {
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Corre el encuadre para dejar lugar a los textos (en px de pantalla)
    if (desplazar) { const [dx, dy] = desplazar(w, h); camera.setViewOffset(w, h, dx, dy, w, h); }
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(lienzo); ajustar();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(lienzo);
  return { renderer, scene, camera, sol, piso, get visible() { return visible; } };
}

// Tubo entre dos puntos
function tubo(padre, a, b, r, mat) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 20), mat);
  m.position.copy(va).add(vb).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  m.castShadow = true; padre.add(m); return m;
}

// Salida CLAMP lateral (sobre +X). Devuelve las piezas para poder desarmarla.
function salidaClamp(padre, x, y, M, esc = 1) {
  const g = new THREE.Group(); g.position.set(x, y, 0); padre.add(g);
  const r = .032 * esc;
  const fijo = tubo(g, [-.02 * esc, 0, 0], [.1 * esc, 0, 0], r * .8, M.acero);
  const ferulaA = new THREE.Mesh(new THREE.CylinderGeometry(r * 2, r * 2, .02 * esc, 40), M.acero);
  ferulaA.rotation.z = Math.PI / 2; ferulaA.position.x = .1 * esc; g.add(ferulaA);
  const junta = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.9, r * 1.9, .01 * esc, 40), M.junta);
  junta.rotation.z = Math.PI / 2; junta.position.x = .116 * esc; g.add(junta);
  const accesorio = new THREE.Group(); accesorio.position.x = .132 * esc; g.add(accesorio);
  const ferulaB = new THREE.Mesh(new THREE.CylinderGeometry(r * 2, r * 2, .02 * esc, 40), M.acero);
  ferulaB.rotation.z = Math.PI / 2; accesorio.add(ferulaB);
  tubo(accesorio, [0, 0, 0], [.09 * esc, 0, 0], r * .8, M.acero);
  const cuerpoValv = new THREE.Mesh(new THREE.BoxGeometry(.07 * esc, .065 * esc, .065 * esc), M.acero);
  cuerpoValv.position.x = .1 * esc; accesorio.add(cuerpoValv);
  tubo(accesorio, [.1 * esc, .03 * esc, 0], [.1 * esc, .09 * esc, 0], .008 * esc, M.acero);
  const manija = new THREE.Mesh(new THREE.BoxGeometry(.012 * esc, .012 * esc, .09 * esc), M.verde);
  manija.position.set(.1 * esc, .095 * esc, 0); accesorio.add(manija);
  const abrazadera = new THREE.Mesh(new THREE.TorusGeometry(r * 2.15, .009 * esc, 12, 48), M.acero);
  abrazadera.rotation.y = Math.PI / 2; abrazadera.position.x = .116 * esc; g.add(abrazadera);
  [fijo, ferulaA, junta, ferulaB, cuerpoValv, abrazadera].forEach(m => { m.castShadow = true; });
  return { grupo: g, junta, accesorio, abrazadera, base: { junta: junta.position.x, accesorio: accesorio.position.x, abrazadera: abrazadera.position.y } };
}

// ---------- Modelos ----------
// Todos apoyan en y = 0 y están en metros reales.

function modeloConico(D, V, M, liquidoMat = M.cerveza) {
  const g = new THREE.Group();
  const r = D / 2, V3 = V / 1000;
  const hc = 1.05 * r;                                   // altura del cono
  const vCono = Math.PI * r * r * hc / 3;
  const hy = Math.max(.35 * D, (V3 - vCono) / (Math.PI * r * r));
  const y0 = Math.max(.32, .5 * D);                      // punta del cono sobre el piso
  const rSal = Math.max(.03, r * .09);
  const yTecho = y0 + hc + hy;
  const radio = y => y < y0 + hc ? rSal + (r - rSal) * Math.max(0, y - y0) / hc : r;

  const perfil = [[rSal, y0], [r, y0 + hc], [r, yTecho], [r * .985, yTecho + .04 * r], [r * .86, yTecho + .09 * r], [r * .45, yTecho + .11 * r], [0, yTecho + .11 * r]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 128), M.pe);
  cuerpo.castShadow = true; g.add(cuerpo);

  const liquido = new THREE.Mesh(new THREE.BufferGeometry(), liquidoMat); g.add(liquido);
  function nivel(frac) {
    const h = y0 + .01 + (yTecho - y0 - .01) * Math.min(.98, Math.max(.02, frac));
    const pts = [new THREE.Vector2(0, y0 + .01)];
    for (let i = 0; i <= 30; i++) { const y = y0 + .01 + (h - y0 - .01) * i / 30; pts.push(new THREE.Vector2(radio(y) * .955, y)); }
    pts.push(new THREE.Vector2(0, h));
    liquido.geometry.dispose(); liquido.geometry = new THREE.LatheGeometry(pts, 96);
  }

  // Tapa a rosca
  const rt = Math.min(.23, r * .44), ht = Math.max(.05, D * .07);
  const tapa = new THREE.Group(); tapa.position.y = yTecho + .11 * r; g.add(tapa);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(rt, rt, ht, 64), M.verde);
  disco.position.y = ht / 2; disco.castShadow = true; tapa.add(disco);
  const rosca = new THREE.Mesh(new THREE.TorusGeometry(rt * 1.02, ht * .12, 12, 64), M.verde);
  rosca.rotation.x = Math.PI / 2; rosca.position.y = ht * .2; tapa.add(rosca);

  // Base metálica
  const base = new THREE.Group(); g.add(base);
  const gr = Math.max(.012, D * .022);
  const aro = (rad, y, grosor) => { const t = new THREE.Mesh(new THREE.TorusGeometry(rad, grosor, 16, 128), M.acero); t.rotation.x = Math.PI / 2; t.position.y = y; t.castShadow = true; base.add(t); };
  aro(r * 1.03, y0 + hc, gr);
  const rPie = r * 1.28, yMedio = (y0 + hc) * .32;
  aro(mezclar(rPie, r * 1.03, yMedio / (y0 + hc)), yMedio, gr * .7);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    tubo(base, [r * 1.03 * c, y0 + hc, r * 1.03 * s], [rPie * c, 0, rPie * s], gr, M.acero);
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(gr * 2.4, gr * 2.4, .01, 24), M.acero);
    pie.position.set(rPie * c, .005, rPie * s); base.add(pie);
  }

  // Descarga de fondo y salida lateral CLAMP
  tubo(g, [0, y0 + .01, 0], [0, y0 - .1, 0], rSal * .6, M.acero);
  const valvula = new THREE.Mesh(new THREE.BoxGeometry(.07, .06, .06), M.acero);
  valvula.position.set(0, y0 - .13, 0); valvula.castShadow = true; g.add(valvula);
  const ySal = y0 + hc + Math.min(.3, hy * .25);
  const esc = Math.min(1.6, Math.max(.7, D));
  const clamp = salidaClamp(g, r * .98, ySal, M, esc);

  nivel(.7);
  return {
    grupo: g, nivel, tapa, tapaY: tapa.position.y, clamp, base,
    alto: tapa.position.y + ht, ancho: rPie * 2, radio: r,
    puntos: { tapa: new THREE.Vector3(0, tapa.position.y + ht + .03, 0), clamp: new THREE.Vector3(r + .2 * esc, ySal, 0), valvula: new THREE.Vector3(0, y0 - .16, 0), base: new THREE.Vector3(rPie * .7, yMedio, rPie * .7) }
  };
}

function modeloPlano(D, V, M) {
  const g = new THREE.Group();
  const r = D / 2, hy = Math.max(.3 * D, (V / 1000) / (Math.PI * r * r));
  const y0 = .04;
  const perfil = [[0, y0], [r * .97, y0], [r, y0 + .03], [r, y0 + hy], [r * .985, y0 + hy + .04 * r], [r * .86, y0 + hy + .1 * r], [r * .4, y0 + hy + .13 * r], [0, y0 + hy + .13 * r]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 128), M.pe);
  cuerpo.castShadow = true; g.add(cuerpo);
  const liquido = new THREE.Mesh(new THREE.BufferGeometry(), M.agua); g.add(liquido);
  function nivel(frac) {
    const h = y0 + .02 + (hy - .02) * Math.min(.98, Math.max(.02, frac));
    liquido.geometry.dispose();
    liquido.geometry = new THREE.LatheGeometry([new THREE.Vector2(0, y0 + .02), new THREE.Vector2(r * .955, y0 + .02), new THREE.Vector2(r * .955, h), new THREE.Vector2(0, h)], 96);
  }
  const rt = Math.min(.3, r * .4), ht = Math.max(.05, D * .06);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(rt, rt, ht, 64), M.verde);
  tapa.position.y = y0 + hy + .13 * r + ht / 2; tapa.castShadow = true; g.add(tapa);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, Math.max(.01, D * .015), 12, 128), M.acero);
  aro.rotation.x = Math.PI / 2; aro.position.y = .03; g.add(aro);
  salidaClamp(g, r * .98, y0 + .12 + D * .05, M, Math.min(1.6, Math.max(.7, D)));
  nivel(.7);
  return { grupo: g, nivel, alto: tapa.position.y + ht, ancho: D, radio: r,
    puntos: { tapa: new THREE.Vector3(0, tapa.position.y + ht, 0), clamp: new THREE.Vector3(r + .15, y0 + .12 + D * .05, 0) } };
}

function modeloHorizontal(V, M) {
  const g = new THREE.Group();
  // Largo ≈ 2,2 diámetros; se despeja D del volumen de la cápsula
  const D = Math.cbrt((V / 1000) * 4 / (Math.PI * 2.2)) * 1.02, r = D / 2, largo = 2.2 * D;
  const yc = r + .08;
  const geo = new THREE.CapsuleGeometry(r, largo - 2 * r, 24, 64);
  const cuerpo = new THREE.Mesh(geo, M.pe);
  cuerpo.rotation.z = Math.PI / 2; cuerpo.position.y = yc; cuerpo.scale.set(.94, 1, 1); cuerpo.castShadow = true; g.add(cuerpo);
  const plano = new THREE.Plane(new THREE.Vector3(0, -1, 0), yc);
  const liqMat = M.agua.clone(); liqMat.clippingPlanes = [plano];
  const liquido = new THREE.Mesh(new THREE.CapsuleGeometry(r * .95, largo - 2 * r, 24, 64), liqMat);
  liquido.rotation.z = Math.PI / 2; liquido.position.y = yc; liquido.scale.set(.94, 1, 1); g.add(liquido);
  const nivel = frac => { plano.constant = yc - r * .95 + 2 * r * .95 * Math.min(.98, Math.max(.02, frac)); };
  const rt = Math.min(.2, r * .35);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(rt, rt, .06, 48), M.verde);
  tapa.position.y = yc + r * .94 + .03; tapa.castShadow = true; g.add(tapa);
  [-1, 1].forEach(s => {
    const cuna = new THREE.Mesh(new THREE.BoxGeometry(.08, .12, D * .8), M.pallet);
    cuna.position.set(s * largo * .3, .06, 0); cuna.castShadow = true; g.add(cuna);
  });
  nivel(.65);
  return { grupo: g, nivel, alto: tapa.position.y + .06, ancho: largo, radio: largo / 2,
    puntos: { tapa: new THREE.Vector3(0, tapa.position.y + .05, 0) } };
}

function modeloBin(V, M) {
  const g = new THREE.Group();
  const [a, p, h] = V <= 600 ? [1.0, .8, .8] : [1.2, 1.0, 1.0];
  const yb = .15;
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(a * .96, h * .96, p * .96, 1, 1, 1), M.pe);
  cuerpo.position.y = yb + h / 2; cuerpo.castShadow = true; g.add(cuerpo);
  const plano = new THREE.Plane(new THREE.Vector3(0, -1, 0), yb);
  const liqMat = M.agua.clone(); liqMat.clippingPlanes = [plano];
  const liquido = new THREE.Mesh(new THREE.BoxGeometry(a * .92, h * .92, p * .92), liqMat);
  liquido.position.y = yb + h / 2; g.add(liquido);
  const nivel = frac => { plano.constant = yb + h * .04 + h * .92 * Math.min(.98, Math.max(.02, frac)); };
  // Jaula
  const bar = (x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), M.jaula); m.position.set(x, y, z); m.castShadow = true; g.add(m); };
  const t = .018;
  for (const z of [-p / 2, p / 2]) for (let i = 0; i <= 4; i++) bar(-a / 2 + a * i / 4, yb + h / 2, z, t, h, t);
  for (const x of [-a / 2, a / 2]) for (let i = 1; i < 4; i++) bar(x, yb + h / 2, -p / 2 + p * i / 4, t, h, t);
  for (const y of [yb, yb + h / 3, yb + 2 * h / 3, yb + h]) { bar(0, y, -p / 2, a, t, t); bar(0, y, p / 2, a, t, t); bar(-a / 2, y, 0, t, t, p); bar(a / 2, y, 0, t, t, p); }
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(a * 1.02, yb, p * 1.02), M.pallet);
  pallet.position.y = yb / 2; pallet.castShadow = true; g.add(pallet);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .05, 32), M.verde);
  tapa.position.y = yb + h + .025; g.add(tapa);
  nivel(.65);
  return { grupo: g, nivel, alto: yb + h + .05, ancho: a, radio: Math.hypot(a, p) / 2,
    puntos: { tapa: new THREE.Vector3(0, yb + h + .06, 0) } };
}

// Persona de referencia de 1,75 m
function persona(M) {
  const g = new THREE.Group();
  const parte = (geo, y, x = 0) => { const m = new THREE.Mesh(geo, M.persona); m.position.set(x, y, 0); m.castShadow = true; g.add(m); };
  parte(new THREE.CapsuleGeometry(.07, .7, 8, 16), .42, -.09);
  parte(new THREE.CapsuleGeometry(.07, .7, 8, 16), .42, .09);
  parte(new THREE.CapsuleGeometry(.17, .42, 8, 24), 1.12);
  parte(new THREE.CapsuleGeometry(.05, .55, 8, 16), 1.1, -.25);
  parte(new THREE.CapsuleGeometry(.05, .55, 8, 16), 1.1, .25);
  parte(new THREE.SphereGeometry(.12, 24, 24), 1.63);
  return g;
}

// Etiquetas HTML que siguen puntos 3D
function etiquetador(contenedor, camera) {
  const v = new THREE.Vector3(), dir = new THREE.Vector3();
  return (puntos, grupo) => {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    camera.getWorldDirection(dir);
    contenedor.querySelectorAll(".punto").forEach(el => {
      const p = puntos && puntos[el.dataset.p];
      if (!p) { el.style.visibility = "hidden"; return; }
      v.copy(p).applyMatrix4(grupo.matrixWorld);
      const lado = v.clone().setY(0).normalize().dot(camera.position.clone().setY(0).normalize());
      const oculto = v.clone().sub(camera.position).dot(dir) < 0 || (el.dataset.p === "clamp" && lado < -.15);
      v.project(camera);
      // Si la etiqueta no entra a la derecha, se muestra a la izquierda del punto
      const x = (v.x * .5 + .5) * w, izq = x + el.offsetWidth > w - 6;
      el.classList.toggle("izq", izq);
      el.style.transform = `translate(${izq ? x + 7 - el.offsetWidth : x - 7}px, ${(-v.y * .5 + .5) * h - 7}px)`;
      el.style.visibility = oculto ? "hidden" : "visible";
    });
  };
}

// ======================================================================
// 1) Anatomía: el fermentador se arma con el scroll
// ======================================================================
function anatomia() {
  const seccion = document.getElementById("anatomia");
  const lienzo = document.getElementById("anat-lienzo");
  if (!seccion || !lienzo) return;
  // En escritorio el tanque va a la derecha de los textos; en celular, arriba
  const mo = motor(lienzo, { desplazar: (w, h) => w > 760 ? [-w * .2, 0] : [0, h * .16] });
  const { renderer, scene, camera } = mo;
  const M = materiales();
  const t = modeloConico(.97, 1000, M);
  scene.add(t.grupo);
  const etiquetar = etiquetador(seccion, camera);
  const pasos = [...seccion.querySelectorAll(".paso-a")];
  const cortes = [0, .16, .36, .6, .8];                  // inicio de cada texto

  // Cámara: [progreso, posición, objetivo]
  const camPos = [[0, [4.4, 2.4, 7.2]], [.2, [2.6, 3.9, 5.2]], [.38, [2.6, 2.1, 3.6]], [.58, [3.0, 1.8, 4.0]], [.8, [4.6, 1.6, 6.2]], [1, [5.4, 2.2, 7.4]]];
  const camObj = [[0, [0, 1.2, 0]], [.2, [0, 1.8, 0]], [.38, [.5, 1.45, 0]], [.58, [.4, 1.3, 0]], [.8, [0, 1.05, 0]], [1, [0, 1.2, 0]]];
  const giro = [[0, -.9], [.18, .2], [.38, -1.25], [.58, -1.25], [.8, .1], [1, .8]];

  let progreso = 0, activo = -1;
  function estado(p) {
    progreso = p;
    t.grupo.rotation.y = tramo(giro, p);
    // Tapa: sube, gira y vuelve a su lugar
    const tapaSube = suave(.18, .28, p) * (1 - suave(.3, .36, p));
    t.tapa.position.y = t.tapaY + tapaSube * .4;
    t.tapa.rotation.y = tapaSube * Math.PI;
    // CLAMP: se desarma y se vuelve a armar
    const abrir = suave(.4, .48, p) * (1 - suave(.54, .6, p));
    t.clamp.junta.position.x = t.clamp.base.junta + abrir * .09;
    t.clamp.accesorio.position.x = t.clamp.base.accesorio + abrir * .22;
    t.clamp.abrazadera.position.y = t.clamp.base.abrazadera + abrir * .18;
    // Llenado
    t.nivel(REDUCIR ? .7 : mezclar(.03, .75, suave(.6, .78, p)));
    camera.position.set(...tramo(camPos, p));
    camera.lookAt(...tramo(camObj, p));
    let i = 0; cortes.forEach((c, k) => { if (p >= c) i = k; });
    if (i !== activo) { activo = i; pasos.forEach((el, k) => el.classList.toggle("activo", k === i)); }
  }

  if (!REDUCIR && window.gsap && window.ScrollTrigger) {
    // Se crea después que los demás efectos de scroll: prioridad alta y recálculo para que
    // los que están más abajo (el despiece CLAMP) tomen en cuenta este tramo fijado.
    window.ScrollTrigger.create({ trigger: seccion, start: "top top", end: "+=3200", pin: ".anat-pin", scrub: .5, refreshPriority: 1, onUpdate: s => estado(s.progress) });
    window.ScrollTrigger.sort();
    window.ScrollTrigger.refresh();
  } else {
    seccion.classList.add("estatico");
    estado(.82);
  }
  estado(0);
  seccion.classList.add("listo");

  const puntosVisibles = () => {
    const p = progreso;
    return { tapa: p > .12 && p < .38 ? t.puntos.tapa : null, clamp: p > .34 && p < .62 ? t.puntos.clamp : null, base: p > .78 ? t.puntos.base : null };
  };
  (function cuadro() {
    requestAnimationFrame(cuadro);
    if (!mo.visible) return;
    renderer.render(scene, camera);
    etiquetar(puntosVisibles(), t.grupo);
  })();
}

// ======================================================================
// 2) Configurador: el tanque que elige el buscador, a escala real
// ======================================================================
function configurador() {
  const cont = document.getElementById("config-3d");
  const lienzo = document.getElementById("config-lienzo");
  if (!cont || !lienzo) return;
  const m = motor(lienzo, { sombraOpacidad: .12 });
  const { renderer, scene, camera } = m;
  const M = materiales();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.autoRotate = !REDUCIR; controls.autoRotateSpeed = .8;
  controls.minPolarAngle = Math.PI * .28; controls.maxPolarAngle = Math.PI * .49;

  const humano = persona(M); scene.add(humano);
  const etiquetar = etiquetador(cont, camera);
  const chip = document.getElementById("config-chip");
  let actual = null, clave = "", nivelObj = .7, nivelAct = 0, aparicion = 1;
  const objetivo = new THREE.Vector3(0, 1, 0), distObj = { v: 6 };

  function mostrar({ tipo, litros, diam }) {
    const k = tipo + "|" + litros + "|" + diam;
    if (k === clave) return; clave = k;
    if (actual) { scene.remove(actual.grupo); actual.grupo.traverse(o => o.geometry && o.geometry.dispose()); }
    actual = tipo === "conico" ? modeloConico(diam / 1000, litros, M)
      : tipo === "plano" ? modeloPlano(diam / 1000, litros, M)
      : tipo === "horizontal" ? modeloHorizontal(litros, M)
      : modeloBin(litros, M);
    scene.add(actual.grupo);
    humano.position.set(-(actual.ancho / 2 + .55), 0, .2);
    // Encuadre: tanque + persona
    const alto = Math.max(actual.alto, 1.8), ancho = actual.ancho + 1.4;
    objetivo.set(-.35, alto * .48, 0);
    const vfov = camera.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    distObj.v = Math.max((alto * .62) / Math.tan(vfov / 2), (ancho * .62) / Math.tan(hfov / 2)) + actual.radio;
    nivelAct = .05; aparicion = 0;
    const altoM = actual.alto.toLocaleString("es-AR", { maximumFractionDigits: 2 });
    chip.querySelector("b").textContent = litros.toLocaleString("es-AR") + " L";
    chip.querySelector("small").textContent = (tipo === "conico" ? "Cónico Ø " + diam.toLocaleString("es-AR") : tipo === "plano" ? "Fondo plano Ø " + diam.toLocaleString("es-AR") : tipo === "horizontal" ? "Horizontal" : "Contenedor BIN") + " · " + altoM + " m de alto";
  }
  // El buscador avisa en cada movimiento del control; el modelo se rehace una vez por cuadro
  let pendiente = null;
  window.addEventListener("tanque", e => { pendiente = e.detail; });
  mostrar(window.ultimoTanque || { tipo: "conico", litros: 1000, diam: 970 });
  camera.position.set(4, 2.4, 6);
  controls.target.copy(objetivo);
  cont.classList.add("listo");

  (function cuadro() {
    requestAnimationFrame(cuadro);
    if (pendiente) { mostrar(pendiente); pendiente = null; }
    if (!m.visible || !actual) return;
    // Transición suave de encuadre y aparición del modelo
    controls.target.lerp(objetivo, .12);
    const off = camera.position.clone().sub(controls.target);
    off.setLength(mezclar(off.length(), distObj.v, .12));
    camera.position.copy(controls.target).add(off);
    aparicion = Math.min(1, aparicion + .06);
    const e = .9 + .1 * (1 - Math.pow(1 - aparicion, 3));
    actual.grupo.scale.setScalar(e);
    if (nivelAct < nivelObj - .005) { nivelAct += (nivelObj - nivelAct) * .06; actual.nivel(nivelAct); }
    controls.update();
    renderer.render(scene, camera);
    etiquetar(actual.puntos, actual.grupo);
  })();
}

for (const iniciar of [anatomia, configurador]) {
  try { iniciar(); } catch (err) { console.warn("Escena 3D no disponible, se muestra la foto.", err); }
}
