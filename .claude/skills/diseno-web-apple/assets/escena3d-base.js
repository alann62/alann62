// Base para escenas 3D estilo Apple con Three.js (skill diseno-web-apple).
// Empaquetar: npx esbuild src/escena3d.js --bundle --minify --format=iife --outfile=js/escena3d.js
// Incluye: motor (render, luz, sombra, resize, visibilidad), materiales probados, tubo entre puntos,
// una conexión CLAMP desarmable de ejemplo, persona de 1,75 m, etiquetas HTML y un ejemplo completo.
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
      el.style.transform = `translate(${(v.x * .5 + .5) * w - 7}px, ${(-v.y * .5 + .5) * h - 7}px)`;
      el.style.visibility = oculto ? "hidden" : "visible";
    });
  };
}

// ======================================================================
// Ejemplo: producto de revolución que gira, con líquido y etiquetas.
// HTML esperado:
//   <div class="escena" id="escena">
//     <img class="respaldo" src="img/producto.webp" alt="">
//     <div class="lienzo" id="lienzo"></div>
//     <div class="punto" data-p="tapa"><i></i><span>Tapa</span></div>
//   </div>
// CSS: .lienzo{position:absolute;inset:0} .escena.listo .respaldo{opacity:0} .escena.listo .punto{opacity:1}
// ======================================================================
function ejemplo() {
  const cont = document.getElementById("escena"), lienzo = document.getElementById("lienzo");
  if (!cont || !lienzo) return;
  const mo = motor(lienzo);
  const { renderer, scene, camera } = mo;
  const M = materiales();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.autoRotate = !REDUCIR; controls.autoRotateSpeed = 1;
  controls.minPolarAngle = Math.PI * .3; controls.maxPolarAngle = Math.PI * .5;

  // Perfil [radio, altura] en metros: base, pared, hombro y techo
  const perfil = [[.3, 0], [.5, .05], [.5, 1.5], [.45, 1.6], [.2, 1.66], [0, 1.67]].map(([x, y]) => new THREE.Vector2(x, y));
  const grupo = new THREE.Group(); scene.add(grupo);
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 128), M.pe); cuerpo.castShadow = true; grupo.add(cuerpo);
  const liquido = new THREE.Mesh(new THREE.LatheGeometry([[0, .02], [.47, .02], [.47, 1.0], [0, 1.0]].map(([x, y]) => new THREE.Vector2(x, y)), 96), M.agua);
  grupo.add(liquido);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .08, 64), M.verde); tapa.position.y = 1.71; grupo.add(tapa);
  salidaClamp(grupo, .49, .25, M);

  camera.position.set(3, 1.8, 4.5); controls.target.set(0, .8, 0);
  const etiquetar = etiquetador(cont, camera);
  const puntos = { tapa: new THREE.Vector3(0, 1.78, 0) };
  cont.classList.add("listo");
  (function cuadro() {
    requestAnimationFrame(cuadro);
    if (!mo.visible) return;
    controls.update(); renderer.render(scene, camera); etiquetar(puntos, grupo);
  })();
}

try { ejemplo(); } catch (err) { console.warn("3D no disponible, queda la foto.", err); }
