// Escenas 3D de la propuesta (Three.js). Se empaqueta con esbuild en js/escena3d.js (ver README).
//  - Anatomía: fermentador cónico que se arma con el scroll (GSAP ScrollTrigger).
//  - Configurador: el tanque del buscador, a escala real junto a una persona de 1,75 m.
//  - Visores del equipo: base, torpedo, tanque plano, cónico y cilíndrico CLAMP para girar.
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
    acero: new THREE.MeshStandardMaterial({ color: 0xc9ced2, metalness: .55, roughness: .3 }),   // metal moderado: con 1 se ve negro en algunos equipos
    verde: new THREE.MeshPhysicalMaterial({ color: 0x12a150, roughness: .32, clearcoat: .6 }),
    junta: new THREE.MeshStandardMaterial({ color: 0x34d27b, roughness: .5 }),
    cerveza: new THREE.MeshStandardMaterial({ color: 0xc46a05, roughness: .12, emissive: 0x7a3a00, emissiveIntensity: .35 }),
    agua: new THREE.MeshStandardMaterial({ color: 0x7cc4e8, roughness: .1, emissive: 0x0d4a70, emissiveIntensity: .2 }),
    persona: new THREE.MeshStandardMaterial({ color: 0xc7c7cc, roughness: .8 }),
    jaula: new THREE.MeshStandardMaterial({ color: 0x9aa3a8, metalness: .8, roughness: .35 }),
    pallet: new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: .7 }),
    blanco: new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, roughness: .42, clearcoat: .35 }),
    verdeClamp: new THREE.MeshPhysicalMaterial({ color: 0x2fbf4a, roughness: .3, clearcoat: .7 })
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

// Salida CLAMP lateral (sobre +X), como la de Infinity: férula blanca moldeada en el tanque, junta,
// abrazadera plástica verde con bulón y mariposa, y llave de paso verde con manija de acero.
// Devuelve las piezas para poder desarmarla en la anatomía.
function salidaClamp(padre, x, y, M, esc = 1) {
  const g = new THREE.Group(); g.position.set(x, y, 0); padre.add(g);
  const r = .032 * esc, blanco = M.blanco || M.pe, verde = M.verdeClamp || M.verde;
  const eje = (m) => { m.rotation.z = Math.PI / 2; m.castShadow = true; return m; };
  const cil = (grupo, rad, largo, mat, px, seg = 40) => { const m = eje(new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, largo, seg), mat)); m.position.x = px; grupo.add(m); return m; };
  // Férula del tanque: cuello blanco con reborde
  cil(g, r * .95, .1 * esc, blanco, .05 * esc);
  const ferulaA = cil(g, r * 1.9, .016 * esc, blanco, .104 * esc, 48);
  // Junta sanitaria
  const junta = cil(g, r * 1.75, .008 * esc, M.junta, .116 * esc, 48);
  // Accesorio: férula verde, cuerpo y llave esférica con manija tipo mariposa
  const accesorio = new THREE.Group(); accesorio.position.x = .128 * esc; g.add(accesorio);
  const ferulaB = cil(accesorio, r * 1.9, .016 * esc, verde, 0, 48);
  cil(accesorio, r * 1.05, .07 * esc, verde, .045 * esc);
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(r * 1.55, 32, 24), verde); esfera.position.x = .1 * esc; esfera.castShadow = true; accesorio.add(esfera);
  cil(accesorio, r * .8, .07 * esc, verde, .15 * esc);
  cil(accesorio, r * 1.1, .012 * esc, verde, .185 * esc);
  const vastago = new THREE.Mesh(new THREE.CylinderGeometry(r * .22, r * .22, r * 1.4, 16), M.acero); vastago.position.set(.1 * esc, r * 1.9, 0); accesorio.add(vastago);
  const manija = new THREE.Group(); manija.position.set(.1 * esc, r * 2.6, 0); accesorio.add(manija);
  for (const s2 of [-1, 1]) { const ala = new THREE.Mesh(new THREE.SphereGeometry(r * .9, 20, 12), M.acero); ala.scale.set(.35, .6, 1.4); ala.position.z = s2 * r * 1.1; ala.castShadow = true; manija.add(ala); }
  // Abrazadera plástica en C con bulón y tuerca mariposa blanca
  const abrazadera = new THREE.Group(); abrazadera.position.x = .116 * esc; g.add(abrazadera);
  const arco = new THREE.Mesh(new THREE.TorusGeometry(r * 2.2, r * .32, 14, 48, Math.PI * 1.75), verde);
  arco.rotation.y = Math.PI / 2; arco.rotation.x = Math.PI * .125 + Math.PI / 2; arco.scale.set(1, 1, 1.4); arco.castShadow = true; abrazadera.add(arco);
  const bulon = new THREE.Mesh(new THREE.CylinderGeometry(r * .13, r * .13, r * 3.2, 12), M.acero); bulon.position.set(0, -r * 2.2, r * .4); bulon.rotation.x = Math.PI / 2; abrazadera.add(bulon);
  const mariposa = new THREE.Group(); mariposa.position.set(0, -r * 2.2, r * 1.9); abrazadera.add(mariposa);
  const cubo = new THREE.Mesh(new THREE.CylinderGeometry(r * .3, r * .3, r * .5, 16), blanco); cubo.rotation.x = Math.PI / 2; mariposa.add(cubo);
  for (const s2 of [-1, 1]) { const a2 = new THREE.Mesh(new THREE.BoxGeometry(r * .18, r * .9, r * .5), blanco); a2.position.y = s2 * r * .6; mariposa.add(a2); }
  [ferulaA, junta, ferulaB].forEach(m => { m.castShadow = true; });
  return { grupo: g, junta, accesorio, abrazadera, base: { junta: junta.position.x, accesorio: accesorio.position.x, abrazadera: abrazadera.position.y } };
}

// Logo pintado en la pared del tanque (se dibuja una vez y se reutiliza)
let texturaLogo = null;
function logoInfinity() {
  if (texturaLogo) return texturaLogo;
  const c = document.createElement("canvas"); c.width = 512; c.height = 400;
  const ctx = c.getContext("2d");
  texturaLogo = new THREE.CanvasTexture(c); texturaLogo.colorSpace = THREE.SRGBColorSpace; texturaLogo.anisotropy = 4;
  const img = new Image();
  const texto = h => {
    ctx.textAlign = "center";
    ctx.fillStyle = "#8cc63f"; ctx.font = "300 78px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText("INFINITY".split("").join(String.fromCharCode(8202)), 256, 40 + h + 70);
    ctx.fillStyle = "#4a4a4a"; ctx.font = "400 40px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText("ROTOMOLDING", 256, 40 + h + 118);
    texturaLogo.needsUpdate = true;
  };
  img.onerror = () => texto(150);
  img.onload = () => {
    const w = 190, h = w * img.height / img.width;
    ctx.drawImage(img, (512 - w) / 2, 20, w, h);
    try { ctx.getImageData(0, 0, 1, 1); } catch (e) { ctx.clearRect(0, 0, 512, 400); texto(150); return; }
    texto(h);
  };
  img.src = "img/logo.png";
  return texturaLogo;
}


// Material del logo (uno solo para todos los tanques)
let materialLogo = null;
const matLogo = () => materialLogo || (materialLogo = new THREE.MeshStandardMaterial({ map: logoInfinity(), transparent: true, roughness: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
// Logo sobre una pared cilíndrica vertical, centrado en el ángulo "centro" (0 = frente)
function logoCilindro(r, alto, centro = .45, arco = 1.15) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r * 1.003, r * 1.003, alto, 48, 1, true, centro - arco / 2, arco), matLogo());
}
// Logo plano (cajas y contenedores)
function logoPlano(ancho) { return new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho / 1.28), matLogo()); }
// Logo curvado alrededor de un eje horizontal (costado de un tanque horizontal)
function logoHorizontal(R, ancho) {
  const alto = ancho / 1.28, geo = new THREE.PlaneGeometry(ancho, alto, 1, 24), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), a = y / R; pos.setY(i, R * Math.sin(a)); pos.setZ(i, R * Math.cos(a)); }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, matLogo());
}
// Tapa a rosca verde de boca ancha, moleteada, con reborde (la de todos los tanques Infinity)
function tapaRosca(M, rt, ht) {
  const tapa = new THREE.Group();
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(rt * .97, rt, ht, 72), M.verde);
  disco.position.y = ht / 2; disco.castShadow = true; tapa.add(disco);
  const nMol = Math.round(Math.min(64, Math.max(28, rt * 220)));
  for (let i = 0; i < nMol; i++) {
    const a = i / nMol * Math.PI * 2, m = new THREE.Mesh(new THREE.BoxGeometry(rt * .05, ht * .8, rt * .07), M.verde);
    m.position.set(Math.cos(a) * rt, ht * .45, Math.sin(a) * rt); m.rotation.y = -a; tapa.add(m);
  }
  const borde = new THREE.Mesh(new THREE.TorusGeometry(rt * .9, ht * .08, 10, 72), M.verde); borde.rotation.x = Math.PI / 2; borde.position.y = ht; tapa.add(borde);
  const rosca = new THREE.Mesh(new THREE.TorusGeometry(rt * 1.02, ht * .12, 12, 64), M.verde); rosca.rotation.x = Math.PI / 2; rosca.position.y = ht * .1; tapa.add(rosca);
  return tapa;
}

// ---------- Modelos ----------
// Todos apoyan en y = 0 y están en metros reales.

function modeloConico(D, V, M, liquidoMat = M.cerveza) {
  const g = new THREE.Group();
  const r = D / 2, V3 = V / 1000;
  const hc = 1.05 * r;                                   // altura del cono
  const vCono = Math.PI * r * r * hc / 3;
  const hy = Math.max(.35 * D, (V3 - vCono) / (Math.PI * r * r));
  const y0 = altoBase(D) - hc;                           // punta del cono: el cono apoya en el aro de la base
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

  // Tapa a rosca de boca ancha, moleteada, con reborde
  const rt = Math.min(.26, r * .5), ht = Math.max(.055, D * .085);
  const tapa = tapaRosca(M, rt, ht); tapa.position.y = yTecho + .11 * r; g.add(tapa);
  // Venteo blanco chico sobre el hombro
  const venteo = new THREE.Mesh(new THREE.CylinderGeometry(r * .07, r * .07, r * .06, 24), M.blanco);
  venteo.position.set(r * .62, yTecho + .075 * r, -r * .3); venteo.castShadow = true; g.add(venteo);

  // Logo en la pared, mirando al frente
  const altoLogo = Math.min(hy * .7, r * .95), arcoLogo = 1.15;
  const logo = logoCilindro(r, altoLogo, .45, arcoLogo);
  logo.position.y = yTecho - hy * .45; g.add(logo);

  // Base metálica como la de la tienda (verde en D40, azul en las demás)
  const b = baseConicaCatalogo(D, { color: D <= .4 ? "verde" : "azul" }), base = b.grupo; g.add(base);

  // Pico de descarga inferior blanco con mini abrazadera
  tubo(g, [0, y0 + .01, 0], [0, y0 - .06, 0], rSal * .75, M.blanco);
  const reborde = new THREE.Mesh(new THREE.CylinderGeometry(rSal * 1.2, rSal * 1.2, .012, 32), M.blanco); reborde.position.y = y0 - .065; g.add(reborde);
  const mini = new THREE.Mesh(new THREE.TorusGeometry(rSal * 1.25, rSal * .18, 10, 32, Math.PI * 1.7), M.verdeClamp); mini.rotation.x = Math.PI / 2; mini.position.y = y0 - .065; g.add(mini);
  const tapon = new THREE.Mesh(new THREE.CylinderGeometry(rSal * 1.15, rSal * 1.15, .02, 32), M.blanco); tapon.position.y = y0 - .082; tapon.castShadow = true; g.add(tapon);
  // La salida CLAMP va abajo, en el cono (como en el tanque real), a un tercio de la punta
  const ySal = y0 + hc * .32, xSal = (rSal + (r - rSal) * .32) * .97;
  const esc = Math.min(1.8, Math.max(.9, D * 1.3));
  const clamp = salidaClamp(g, xSal, ySal, M, esc);
  const rPie = r * 1.05, yMedio = b.alto * .24;

  nivel(.7);
  return {
    grupo: g, nivel, tapa, tapaY: tapa.position.y, clamp, base,
    alto: tapa.position.y + ht, ancho: rPie * 2, radio: r,
    puntos: { tapa: new THREE.Vector3(0, tapa.position.y + ht + .03, 0), clamp: new THREE.Vector3(xSal + .3 * esc, ySal, 0), valvula: new THREE.Vector3(0, y0 - .1, 0), base: new THREE.Vector3(r * .72, yMedio, r * .72) }, y0
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
  const rt = Math.min(.3, r * .46), ht = Math.max(.05, D * .08);
  const tapa = tapaRosca(M, rt, ht); tapa.position.y = y0 + hy + .13 * r; g.add(tapa);
  const venteo = new THREE.Mesh(new THREE.CylinderGeometry(r * .07, r * .07, r * .06, 24), M.blanco || M.pe);
  venteo.position.set(r * .62, y0 + hy + .09 * r, -r * .3); g.add(venteo);
  const altoLogo = Math.min(hy * .6, r * .95), logo = logoCilindro(r, altoLogo, .45, 1.15);
  logo.position.y = y0 + hy * .58; g.add(logo);
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
  // Nervaduras moldeadas a lo largo del cuerpo
  for (const x of [-.3, -.1, .1, .3]) { const n = new THREE.Mesh(new THREE.TorusGeometry(r * .97, r * .045, 12, 64), M.pe); n.rotation.y = Math.PI / 2; n.position.set(x * largo, yc, 0); n.scale.set(1, 1, .94); n.castShadow = true; g.add(n); }
  const rt = Math.min(.2, r * .35);
  const tapa = tapaRosca(M, rt, .06); tapa.position.y = yc + r * .94 - .005; g.add(tapa);
  // Logo en el costado, entre dos nervaduras
  const logo = logoHorizontal(r * 1.004, Math.min(largo * .17, r * 1.1)); logo.scale.y = .94; logo.position.set(largo * .2, yc, 0); g.add(logo);
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
  const tapa = tapaRosca(M, .09, .05); tapa.position.y = yb + h * .98; g.add(tapa);
  const logo = logoPlano(a * .32); logo.position.set(-a * .125, yb + h * .6, p * .48 + .004); g.add(logo);
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
  const camPos = [[0, [4.4, 2.4, 7.2]], [.2, [2.6, 3.9, 5.2]], [.38, [2.4, 1.25, 3.3]], [.58, [2.8, 1.2, 3.7]], [.8, [4.6, 1.6, 6.2]], [1, [5.4, 2.2, 7.4]]];
  const camObj = [[0, [0, 1.2, 0]], [.2, [0, 1.8, 0]], [.38, [.5, .72, 0]], [.58, [.45, .75, 0]], [.8, [0, 1.05, 0]], [1, [0, 1.2, 0]]];
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

// ======================================================================
// 3) Visores del equipo: bases, torpedo y tanques, para girar con el dedo
// ======================================================================
function materialesEquipo(M) {
  return {
    ...M,
    esmalte: new THREE.MeshPhysicalMaterial({ color: 0x103a82, metalness: .15, roughness: .42, clearcoat: .6, clearcoatRoughness: .3 }),
    esmalteVerde: new THREE.MeshPhysicalMaterial({ color: 0x1f5a5c, metalness: .15, roughness: .42, clearcoat: .6, clearcoatRoughness: .3 }),
    inox: new THREE.MeshStandardMaterial({ color: 0xd6dbdf, metalness: .55, roughness: .28 }),
    blanco: new THREE.MeshPhysicalMaterial({ color: 0xf4f4f2, roughness: .45, clearcoat: .3 }),
    azul: new THREE.MeshPhysicalMaterial({ color: 0x2456b8, roughness: .35, clearcoat: .5 }),
    gris: new THREE.MeshStandardMaterial({ color: 0x9ea3a6, metalness: .2, roughness: .5 }),
    negro: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: .55 }),
    bronce: new THREE.MeshStandardMaterial({ color: 0x7a3b1e, metalness: .3, roughness: .45 }),
    fantasma: new THREE.MeshPhysicalMaterial({ color: 0xf2f4f1, roughness: .35, transmission: .85, thickness: .2, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }),
    cristal: new THREE.MeshPhysicalMaterial({ color: 0xdfeaf0, roughness: .12, transmission: .6, thickness: .02, ior: 1.5, clearcoat: 1, side: THREE.DoubleSide }),
    colores: {
      natural: new THREE.MeshPhysicalMaterial({ color: 0xf1f2ee, roughness: .5, transmission: .35, thickness: .5, clearcoat: .3 }),
      negro: new THREE.MeshPhysicalMaterial({ color: 0x1f1f21, roughness: .5, clearcoat: .3 }),
      rojo: new THREE.MeshPhysicalMaterial({ color: 0x8c1d18, roughness: .5, clearcoat: .3 })
    }
  };
}
const malla = (padre, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; padre.add(m); return m; };
function barra(padre, a, b, lado, mat) {   // caño de sección cuadrada entre dos puntos
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const m = malla(padre, new THREE.BoxGeometry(lado, va.distanceTo(vb), lado), mat);
  m.position.copy(va).add(vb).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return m;
}

// Base metálica: aro superior, cuatro patas de caño cuadrado, marco inferior y pies
function modeloBaseEquipo(M) {
  const g = new THREE.Group(), l = .025, h = .72, rA = .3, lado = .27;
  const aro = malla(g, new THREE.TorusGeometry(rA, .014, 12, 96), M.esmalte, 0, h); aro.rotation.x = Math.PI / 2;
  const aro2 = malla(g, new THREE.TorusGeometry(rA * .96, .01, 10, 96), M.esmalte, 0, h - .05); aro2.rotation.x = Math.PI / 2;
  const esq = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  esq.forEach(([sx, sz]) => {
    const top = [sx * rA * .707, h, sz * rA * .707], bot = [sx * lado, 0.02, sz * lado];
    barra(g, top, bot, l, M.esmalte);
    malla(g, new THREE.BoxGeometry(.07, .008, .07), M.esmalte, bot[0], .004, bot[2]);
  });
  for (let i = 0; i < 4; i++) {
    const [ax, az] = esq[i], [bx, bz] = esq[(i + 1) % 4];
    for (const y of [.12, .42]) {
      const k = (h - y) / (h - .02), rx = mezclar(lado, rA * .707, 1 - k);
      barra(g, [ax * rx, y, az * rx], [bx * rx, y, bz * rx], l * .8, M.esmalte);
    }
  }
  malla(g, new THREE.BoxGeometry(lado * 1.9, .006, lado * 1.9), M.gris, 0, .12);
  return g;
}

// Torpedo de acero inoxidable con su tapa verde
function modeloTorpedo(M) {
  const g = new THREE.Group(), yTapa = .78;
  malla(g, new THREE.CylinderGeometry(.11, .11, .035, 64), M.verde, 0, yTapa);
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; malla(g, new THREE.BoxGeometry(.008, .03, .012), M.verde, Math.cos(a) * .112, yTapa, Math.sin(a) * .112).rotation.y = -a; }
  malla(g, new THREE.TorusGeometry(.045, .006, 10, 40), M.verde, 0, yTapa + .018).rotation.x = Math.PI / 2;
  // Tubo principal de 4" con fondo redondeado
  const yTubo = .06, largo = .46;
  malla(g, new THREE.CylinderGeometry(.051, .051, largo, 48), M.inox, 0, yTubo + largo / 2);
  malla(g, new THREE.SphereGeometry(.051, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.inox, 0, yTubo);
  malla(g, new THREE.CylinderGeometry(.052, .052, .012, 48), M.inox, 0, yTubo + largo);
  // Dos tubos de 13 mm que atraviesan la tapa (como en la foto)
  for (const [x, z] of [[.022, 0], [-.022, 0]]) {
    tubo(g, [x, yTubo + largo, z], [x, yTapa + .09, z], .0065, M.inox);
    malla(g, new THREE.CylinderGeometry(.009, .009, .018, 6), M.inox, x, yTapa + .1, z);
  }
  return g;
}

// Tanque de fondo plano sobre base de cuatro patas, con canilla de descarga
function modeloPlanoBase(M) {
  const g = new THREE.Group(), alto = .42, D = .97;
  const t = modeloPlano(D, 900, M); t.grupo.position.y = alto; g.add(t.grupo);
  const r = D / 2 * 1.02;
  const aro = malla(g, new THREE.TorusGeometry(r, .022, 12, 96), M.esmalteVerde, 0, alto + .02); aro.rotation.x = Math.PI / 2;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a) * r, z = Math.sin(a) * r;
    barra(g, [c, alto, z], [c * 1.08, .01, z * 1.08], .035, M.esmalteVerde);
    malla(g, new THREE.BoxGeometry(.08, .01, .08), M.esmalteVerde, c * 1.08, .005, z * 1.08);
  }
  const canilla = new THREE.Group(); canilla.position.set(0, alto + .1, r); g.add(canilla);
  malla(canilla, new THREE.CylinderGeometry(.018, .018, .06, 20), M.bronce, 0, 0, .02).rotation.x = Math.PI / 2;
  malla(canilla, new THREE.BoxGeometry(.05, .012, .012), M.verde, 0, .03, .03);
  malla(canilla, new THREE.CylinderGeometry(.012, .012, .05, 16), M.bronce, 0, -.03, .045);
  return { grupo: g, puntos: { tapa: t.puntos.tapa.clone().setY(t.puntos.tapa.y + alto), clamp: t.puntos.clamp.clone().setY(t.puntos.clamp.y + alto) } };
}

// Cilíndrico vertical de gran volumen (10.000 L, Ø 2,5 m) con tapa de 43 cm, cáncamos y salida CLAMP
function modeloCilindrico(M, h = 2.05) {
  const g = new THREE.Group(), r = 1.25;
  const perfil = [[0, 0], [r - .06, 0], [r, .06], [r, h], [r - .08, h + .16], [r * .72, h + .3], [.36, h + .34], [0, h + .34]].map(([x, y]) => new THREE.Vector2(x, y));
  const cuerpo = malla(g, new THREE.LatheGeometry(perfil, 160), M.colores.natural);
  // Plataforma elevada alrededor de la boca
  malla(g, new THREE.CylinderGeometry(.36, .42, .08, 64), M.colores.natural, 0, h + .38).userData.pinta = true;
  cuerpo.userData.pinta = true;
  const tapa = tapaRosca(M, .215, .09); tapa.position.y = h + .42; g.add(tapa);
  const logo = logoCilindro(r, .9, .45, .72); logo.position.y = h * .52; g.add(logo);
  // Cáncamos de izaje (dos orejas moldeadas)
  for (const a of [Math.PI * .25, Math.PI * 1.25]) {
    const o = malla(g, new THREE.TorusGeometry(.07, .025, 10, 24, Math.PI), M.colores.natural, Math.cos(a) * (r - .12), h + .16, Math.sin(a) * (r - .12));
    o.rotation.y = -a + Math.PI / 2; o.userData.pinta = true;
  }
  // Venteo superior
  malla(g, new THREE.CylinderGeometry(.03, .03, .08, 20), M.gris, -.55, h + .3, .35);
  // Salida CLAMP termoformada abajo
  salidaClamp(g, r * .98, .16, M, 1.6);
  const pintar = color => g.traverse(o => { if (o.userData.pinta) o.material = M.colores[color]; });
  return { grupo: g, pintar, puntos: {
    tapa: new THREE.Vector3(0, h + .5, 0), canc: new THREE.Vector3(Math.cos(Math.PI * .25) * (r - .12), h + .24, Math.sin(Math.PI * .25) * (r - .12)),
    clamp: new THREE.Vector3(r + .3, .16, 0), uv: new THREE.Vector3(-r * .7, 1.1, r * .72), peso: new THREE.Vector3(r * .72, 1.3, r * .72) } };
}

// ---------- Bases del catálogo (según las fotos de la tienda) ----------
const COLOR_BASE = { verde: 0x1f9448, azul: 0x0f4470, celeste: 0x4f8fcf, petroleo: 0x1f5a5c, rojo: 0xd0231a };
function matBase(color) {
  return color === "rojo" ? new THREE.MeshPhysicalMaterial({ color: COLOR_BASE.rojo, roughness: .42, clearcoat: .4 })
    : new THREE.MeshPhysicalMaterial({ color: COLOR_BASE[color], metalness: .15, roughness: .42, clearcoat: .6, clearcoatRoughness: .3 });
}

// Base cónica, según las fotos de la tienda. Las chicas (D40 a D69) son altas y angostas:
// aro arriba, patas casi rectas, dos marcos cuadrados cerca del piso y, salvo las D40 más chicas,
// cuatro tirantes en diagonal que bajan del aro a un aro interior donde apoya la punta del cono.
const altoBase = D => D <= .7 ? D * 1.75 : D <= 1 ? D * 1.05 : D * .85;
function baseConicaCatalogo(D, { reforzada = false, color = "azul", simple = false } = {}) {
  const g = new THREE.Group(), mat = matBase(color), r = D / 2, h = altoBase(D);
  const l = Math.max(.016, D * .028) * (reforzada ? 1.3 : 1), rA = r * 1.02;
  const arriba = rA * .72, abajo = D > 1 ? arriba * 1.1 : arriba * .93;
  malla(g, new THREE.TorusGeometry(rA, l * .5, 12, 96), mat, 0, h).rotation.x = Math.PI / 2;
  const esq = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  const enPata = (sx, sz, y) => { const a = mezclar(abajo, arriba, y / h); return [sx * a, y, sz * a]; };
  esq.forEach(([sx, sz]) => {
    barra(g, [sx * arriba, h, sz * arriba], [sx * abajo, .01, sz * abajo], l, mat);
    malla(g, new THREE.BoxGeometry(l * 2.6, .008, l * 2.6), mat, sx * abajo, .004, sz * abajo);
  });
  const marcos = reforzada ? [h * .1, h * .24, h * .4] : [h * .1, h * .24];
  for (const y of marcos) for (let i = 0; i < 4; i++) {
    const [ax, az] = esq[i], [bx, bz] = esq[(i + 1) % 4];
    barra(g, enPata(ax, az, y), enPata(bx, bz, y), l * .8, mat);
  }
  if (!simple) {
    const yInt = h * (D <= .7 ? .56 : .45), rInt = r * .4;
    malla(g, new THREE.TorusGeometry(rInt, l * .45, 10, 64), mat, 0, yInt).rotation.x = Math.PI / 2;
    esq.forEach(([sx, sz]) => {
      // tirante diagonal desde el aro de arriba y rayo horizontal desde la pata
      const a = Math.atan2(sz, sx);
      barra(g, [Math.cos(a) * rA, h, Math.sin(a) * rA], [Math.cos(a) * rInt, yInt, Math.sin(a) * rInt], l * .75, mat);
      barra(g, enPata(sx, sz, yInt), [sx * rInt * .707, yInt, sz * rInt * .707], l * .6, mat);
    });
  }
  return { grupo: g, alto: h };
}

// Base plana estática: aro o bastidor bajo y cuatro patas; con disco o con piso según el modelo
function basePlanaCatalogo(D, { disco = false, piso = false } = {}) {
  const g = new THREE.Group(), mat = matBase("petroleo"), r = D / 2 * 1.02, alto = .32 + D * .08, l = Math.max(.025, D * .035);
  if (piso) {
    const a = D / 2;
    const c = [[a, a], [a, -a], [-a, -a], [-a, a]];
    for (let i = 0; i < 4; i++) barra(g, [c[i][0], alto, c[i][1]], [c[(i + 1) % 4][0], alto, c[(i + 1) % 4][1]], .03, mat);
    for (const t of [-.5, 0, .5]) { barra(g, [t * a, alto, -a], [t * a, alto, a], .03, mat); barra(g, [-a, alto, t * a], [a, alto, t * a], .03, mat); }
    c.forEach(([x, z]) => { barra(g, [x, alto, z], [x, .02, z], .035, mat); malla(g, new THREE.BoxGeometry(.09, .008, .09), mat, x, .004, z); });
  } else {
    malla(g, new THREE.TorusGeometry(r, l * .6, 12, 96), mat, 0, alto).rotation.x = Math.PI / 2;
    for (let k = 0; k < 4; k++) {
      const an = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(an) * r, z = Math.sin(an) * r;
      barra(g, [c, alto, z], [c * 1.1, .02, z * 1.1], l, mat);
      malla(g, new THREE.BoxGeometry(l * 2.6, .008, l * 2.6), mat, c * 1.1, .004, z * 1.1);
    }
    if (disco) malla(g, new THREE.CylinderGeometry(r * .98, r * .98, .006, 96), matBase("petroleo"), 0, alto + .004);
  }
  return { grupo: g, alto: alto + .01 };
}

// Base plástica D40: columna central con copa y cuatro aletas en cruz (roja, como la de la tienda)
function basePlasticaCatalogo() {
  const g = new THREE.Group(), mat = matBase("rojo");
  malla(g, new THREE.CylinderGeometry(.045, .05, .3, 32), mat, 0, .19);
  const copa = [[.03, .3], [.05, .3], [.09, .4], [.09, .41], [.08, .41], [.045, .33], [.03, .33]].map(([x, y]) => new THREE.Vector2(x, y));
  malla(g, new THREE.LatheGeometry(copa, 48), mat).material.side = THREE.DoubleSide;
  const forma = new THREE.Shape([[0, 0], [.2, 0], [.2, .035], [.06, .34], [0, .34]].map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(forma, { depth: .018, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2 });
  geo.translate(0, 0, -.009);
  for (let k = 0; k < 4; k++) { const a = malla(g, geo, mat); a.rotation.y = k * Math.PI / 2 + Math.PI / 4; }
  return { grupo: g, alto: .4 };
}

// Arma la base elegida y, si se pide, el tanque que va encima (translúcido)
function armarBase(sel, M) {
  const g = new THREE.Group();
  const b = sel.tipo === "plana" ? basePlanaCatalogo(sel.D, sel) : sel.tipo === "plastica" ? basePlasticaCatalogo() : baseConicaCatalogo(sel.D, sel);
  g.add(b.grupo);
  if (sel.tanque) {
    const Mt = { ...M, pe: M.fantasma };
    let t;
    if (sel.tipo === "plana") { t = modeloPlano(sel.D, sel.litros || 500, Mt); t.grupo.position.y = b.alto; }
    else { t = modeloConico(sel.D, sel.litros || 100, Mt, M.agua); t.base.visible = false; t.grupo.position.y = sel.tipo === "plastica" ? .012 - (t.y0 - .32) : b.alto - altoBase(sel.D); }
    g.add(t.grupo);
  }
  return g;
}

function visorEquipo(el) {
  const lienzo = el.querySelector(".visor-lienzo");
  const m = motor(lienzo, { sombraOpacidad: .16 });
  const { renderer, scene, camera, sol } = m;
  const M = materialesEquipo(materiales());
  const tipo = el.dataset.modelo;
  const hecho = tipo === "base" ? { grupo: armarBase(el._eleccion || { tipo: "conica", D: .97 }, M) } : tipo === "torpedo" ? { grupo: modeloTorpedo(M) }
    : tipo === "plano" ? modeloPlanoBase(M) : tipo === "cilindrico" ? modeloCilindrico(M) : modeloConico(.5, 110, M, M.agua);
  const modelo = hecho.grupo;
  scene.add(modelo);
  const humano = tipo === "cilindrico" ? persona(M) : null;
  if (humano) { humano.position.set(-1.9, 0, .3); scene.add(humano); }
  // Botones de color (solo el cilíndrico)
  const botones = [...el.querySelectorAll("[data-color]")];
  botones.forEach(bt => bt.addEventListener("click", () => { hecho.pintar(bt.dataset.color); botones.forEach(o => o.setAttribute("aria-pressed", String(o === bt))); }));
  const etiquetar = hecho.puntos && el.querySelector(".punto") ? etiquetador(el, camera) : null;
  // Encuadre automático según el tamaño de la pieza
  const caja = new THREE.Box3().setFromObject(modelo); if (humano) caja.expandByObject(humano);
  const centro = caja.getCenter(new THREE.Vector3()), tam = caja.getSize(new THREE.Vector3());
  const radio = tam.length() / 2;
  Object.assign(sol.shadow.camera, { left: -radio * 2, right: radio * 2, top: radio * 2, bottom: -radio * 2 }); sol.shadow.camera.updateProjectionMatrix();
  sol.position.set(radio * 3, radio * 6, radio * 4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.autoRotate = !REDUCIR; controls.autoRotateSpeed = 1.6;
  controls.minPolarAngle = Math.PI * .15; controls.maxPolarAngle = Math.PI * .47;
  controls.target.copy(centro);
  const factor = tipo === "cilindrico" ? .95 : tipo === "base" ? 1.2 : 1.05;
  const dist = radio / Math.sin(camera.fov * Math.PI / 360) * factor;
  camera.position.copy(centro).add(new THREE.Vector3(.75, .38, 1).setLength(dist));
  // Encuadre objetivo (para las bases, que cambian de tamaño al elegir otra)
  const destino = { centro: centro.clone(), dist };
  let actual = modelo;
  if (tipo === "base") el.addEventListener("elegir", e => {
    scene.remove(actual); actual.traverse(o => o.geometry && o.geometry.dispose());
    actual = armarBase(e.detail, M); actual.scale.setScalar(.92); scene.add(actual);
    const c2 = new THREE.Box3().setFromObject(actual), s2 = c2.getSize(new THREE.Vector3());
    destino.centro = c2.getCenter(new THREE.Vector3()); destino.dist = s2.length() / 2 / .92 / Math.sin(camera.fov * Math.PI / 360) * factor;
  });
  el.classList.add("listo");
  (function cuadro() {
    requestAnimationFrame(cuadro);
    if (!m.visible) return;
    if (tipo === "base") {
      controls.target.lerp(destino.centro, .12);
      const off = camera.position.clone().sub(controls.target);
      off.setLength(mezclar(off.length(), destino.dist, .12));
      camera.position.copy(controls.target).add(off);
      if (actual.scale.x < 1) actual.scale.setScalar(Math.min(1, actual.scale.x + .01));
    }
    controls.update(); renderer.render(scene, camera);
    if (etiquetar) etiquetar(hecho.puntos, modelo);
  })();
}
function visores() {
  const lista = [...document.querySelectorAll(".visor[data-modelo]")];
  // Cada visor arranca cuando se acerca a la pantalla (menos memoria y batería al cargar)
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    try { visorEquipo(e.target); } catch (err) { console.warn("Visor 3D no disponible, se muestra la foto.", err); }
  }), { rootMargin: "400px 0px" });
  lista.forEach(el => io.observe(el));
  // La miniatura de la foto real se agranda al tocarla
  lista.forEach(el => { const b = el.querySelector(".visor-foto"); b && b.addEventListener("click", () => { const on = el.classList.toggle("ver-foto"); b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Volver al 3D" : "Ver foto real"); }); });
}

// ======================================================================
// 4) Modelo 3D de cada producto de la tienda (para el aviso "Agregado" y el pedido)
// ======================================================================
// Batea antiderrame: caja abierta de paredes gruesas, algo más ancha arriba
function modeloBatea(V, M) {
  const g = new THREE.Group(), mat = new THREE.MeshPhysicalMaterial({ color: 0xe8e4de, roughness: .55, clearcoat: .2 });
  const a = Math.cbrt((V / 1000) / .7), L = a * 1.4, P = a, H = a * .5, e = .04;
  malla(g, new THREE.BoxGeometry(L, e, P), mat, 0, e / 2);
  for (const s of [-1, 1]) {
    const w = malla(g, new THREE.BoxGeometry(e, H, P + e), mat, s * (L / 2), H / 2); w.rotation.z = s * -.06;
    const w2 = malla(g, new THREE.BoxGeometry(L + e, H, e), mat, 0, H / 2, s * (P / 2)); w2.rotation.x = s * .06;
  }
  const borde = [[L + .08, .03, .06, 0, H, P / 2 + .03], [L + .08, .03, .06, 0, H, -P / 2 - .03], [.06, .03, P + .08, L / 2 + .03, H, 0], [.06, .03, P + .08, -L / 2 - .03, H, 0]];
  borde.forEach(([x, y, z, px, py, pz]) => malla(g, new THREE.BoxGeometry(x, y, z), mat, px, py, pz));
  return g;
}
// Caja cajón con ruedas y tapa entreabierta
function modeloCajon(M) {
  const g = new THREE.Group(), mat = new THREE.MeshPhysicalMaterial({ color: 0xeeeeea, roughness: .5, clearcoat: .2 });
  const L = .8, P = .55, H = .5, y0 = .12;
  malla(g, new THREE.BoxGeometry(L, H, P), mat, 0, y0 + H / 2);
  const tapa = new THREE.Group(); tapa.position.set(0, y0 + H, -P / 2); g.add(tapa);
  malla(tapa, new THREE.BoxGeometry(L + .02, .025, P + .02), mat, 0, 0, P / 2); tapa.rotation.x = -.35;
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    malla(g, new THREE.BoxGeometry(.03, y0, .03), M.jaula, x * (L / 2 - .05), y0 / 2 + .02, z * (P / 2 - .05));
    const rueda = malla(g, new THREE.CylinderGeometry(.035, .035, .025, 24), M.negro, x * (L / 2 - .05), .035, z * (P / 2 - .05)); rueda.rotation.x = Math.PI / 2;
  }
  malla(g, new THREE.BoxGeometry(L + .04, .03, P + .04), M.jaula, 0, y0 + .015);
  const logo = logoPlano(.26); logo.position.set(-.18, y0 + H * .55, P / 2 + .003); g.add(logo);
  return g;
}
// Recipiente cilíndrico con tapa y manija
function modeloRecipiente(V, M, negro) {
  const g = new THREE.Group(), mat = negro ? M.colores.negro : new THREE.MeshPhysicalMaterial({ color: 0x7ed957, roughness: .42, clearcoat: .4 });
  const r = Math.cbrt((V / 1000) / (2.4 * Math.PI)), h = r * 2.4;
  malla(g, new THREE.CylinderGeometry(r, r * .92, h, 64), mat, 0, h / 2);
  for (let i = 1; i < 4; i++) malla(g, new THREE.TorusGeometry(r * (.92 + .08 * i / 4) + .004, .008, 8, 64), mat, 0, h * i / 4).rotation.x = Math.PI / 2;
  const tapaMat = negro ? M.colores.negro : new THREE.MeshPhysicalMaterial({ color: 0x8ee063, roughness: .4, clearcoat: .4 });
  malla(g, new THREE.CylinderGeometry(r * 1.04, r * 1.04, .04, 64), tapaMat, 0, h + .02);
  malla(g, new THREE.BoxGeometry(r * .8, .04, r * .3), tapaMat, 0, h + .06);
  return g;
}
// Cónico sin base: baja el tanque para que la válvula quede cerca del piso
function conicoSolo(D, V, M) {
  const t = modeloConico(D, V, M, M.agua); t.base.visible = false;
  t.grupo.position.y = -(t.y0 - .12);
  const g = new THREE.Group(); g.add(t.grupo); return g;
}
function modeloProducto(p, M) {
  const n = p.nombre, d = (n.match(/D(\d+)/) || [])[1], litros = +((n.match(/([\d.]+)\s*L\b/) || [])[1] || "0").replace(/\./g, "");
  if (p.cat === "Fermentadores") {
    if (/Madurador/.test(n)) { const t = modeloPlano(litros > 100 ? .69 : .4, litros, M); return t.grupo; }
    const D = p.diam ? p.diam / 1000 : litros >= 300 ? .69 : .38;
    return litros >= 200 ? modeloConico(D, litros, M, M.agua).grupo : conicoSolo(D, litros, M);
  }
  if (p.cat === "Tanques") {
    if (p.horiz) return modeloHorizontal(p.horiz, M).grupo;
    if (p.plano >= 10000) return modeloCilindrico(M, p.plano >= 15000 ? 3.06 : 2.05).grupo;
    return modeloPlano(.4, p.plano, M).grupo;
  }
  if (p.cat === "Bases") {
    const D = (+d || 40) / 100, tipo = /plástica/.test(n) ? "plastica" : /plana/.test(n) ? "plana" : "conica";
    return armarBase({ tipo, D: tipo === "plastica" ? .4 : D, color: +d === 40 ? "verde" : /liviana/.test(n) ? "celeste" : "azul", simple: +d === 40 && (p.dmax || 0) <= 70, reforzada: /reforzada/.test(n), disco: /disco/.test(n), piso: /piso/.test(n) }, M);
  }
  if (p.cat === "Accesorios CLAMP") return null;   // accesorios chicos: se muestra la foto real
  if (/Batea/.test(n)) return modeloBatea(litros, M);
  if (/cajón/.test(n)) return modeloCajon(M);
  if (/Recipiente/.test(n)) return modeloRecipiente(litros, M, litros >= 100);
  return null;
}

// Visor reutilizable: muestra el producto que se le pase, girando
function crearVisorProducto(lienzo) {
  const m = motor(lienzo, { sombraOpacidad: .14 });
  const { renderer, scene, camera, sol } = m;
  const M = materialesEquipo(materiales());
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.autoRotate = !REDUCIR; controls.autoRotateSpeed = 2;
  controls.minPolarAngle = Math.PI * .15; controls.maxPolarAngle = Math.PI * .47;
  let actual = null, idActual = null;
  const destino = { centro: new THREE.Vector3(0, .5, 0), dist: 3 }, humano = persona(M);
  camera.position.set(2, 1.2, 2.6);
  function mostrar(p) {
    if (!p || p.id === idActual) return !!actual;
    const g = modeloProducto(p, M);
    if (actual) { scene.remove(actual); actual.traverse(o => o.geometry && o.geometry.dispose()); scene.remove(humano); }
    actual = g; idActual = p.id;
    if (!g) return false;
    scene.add(g); g.scale.setScalar(.85);
    const caja = new THREE.Box3().setFromObject(g), tam = caja.getSize(new THREE.Vector3());
    // Tanques grandes: persona de referencia al lado
    if (tam.y > 1.8) { humano.position.set(caja.min.x - .45, 0, .2); scene.add(humano); caja.expandByObject(humano); }
    const t2 = caja.getSize(new THREE.Vector3()), radio = t2.length() / 2 / .85;
    destino.centro = caja.getCenter(new THREE.Vector3()); destino.dist = radio / Math.sin(camera.fov * Math.PI / 360) * 1.02;
    Object.assign(sol.shadow.camera, { left: -radio * 2, right: radio * 2, top: radio * 2, bottom: -radio * 2 }); sol.shadow.camera.updateProjectionMatrix();
    sol.position.set(radio * 3, radio * 6, radio * 4);
    // Encuadre directo (sin esperar la transición): el producto aparece bien desde el primer cuadro
    controls.target.copy(destino.centro);
    camera.position.copy(destino.centro).add(new THREE.Vector3(.75, .45, 1).setLength(destino.dist));
    return true;
  }
  (function cuadro() {
    requestAnimationFrame(cuadro);
    if (!m.visible || !actual) return;
    controls.target.lerp(destino.centro, .15);
    const off = camera.position.clone().sub(controls.target);
    off.setLength(mezclar(off.length(), destino.dist, .15));
    camera.position.copy(controls.target).add(off);
    if (actual.scale.x < 1) actual.scale.setScalar(Math.min(1, actual.scale.x + .012));
    controls.update(); renderer.render(scene, camera);
  })();
  return { mostrar };
}
// La página pide visores con esto (el script de la tienda se carga antes que el 3D)
window.Infinity3D = { visor: lienzo => { try { return crearVisorProducto(lienzo); } catch (e) { console.warn("3D no disponible", e); return null; } } };
window.dispatchEvent(new Event("infinity3d"));

for (const iniciar of [anatomia, configurador, visores]) {
  try { iniciar(); } catch (err) { console.warn("Escena 3D no disponible, se muestra la foto.", err); }
}
