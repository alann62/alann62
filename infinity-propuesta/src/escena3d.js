// Escena 3D del tanque. Se empaqueta con esbuild en js/escena3d.js (ver README).
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const escena = document.getElementById("escena");
const lienzo = document.getElementById("lienzo");
const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  lienzo.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
  camera.position.set(3.2, 1.9, 5.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, .62, 0);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.autoRotate = !reducir; controls.autoRotateSpeed = 1.2;
  controls.minPolarAngle = Math.PI * .3; controls.maxPolarAngle = Math.PI * .5;

  // ---- Materiales ----
  const pe = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f1, roughness: .38, transmission: .78, thickness: .25, ior: 1.46, clearcoat: .5, clearcoatRoughness: .25, side: THREE.DoubleSide });
  const acero = new THREE.MeshStandardMaterial({ color: 0xd3d8dc, metalness: 1, roughness: .26 });
  const verde = new THREE.MeshPhysicalMaterial({ color: 0x12a150, roughness: .32, clearcoat: .6 });
  const cerveza = new THREE.MeshStandardMaterial({ color: 0xc46a05, roughness: .12, metalness: 0, emissive: 0x7a3a00, emissiveIntensity: .35 });

  const tanque = new THREE.Group(); scene.add(tanque);

  // ---- Cuerpo: perfil de revolución (cono + cilindro + techo) ----
  const radio = y => y < .56 ? .07 + .43 * Math.max(0, y - .02) / .54 : .5;
  const perfil = [[.055, 0], [.07, .02], [.5, .56], [.5, 1.62], [.492, 1.66], [.44, 1.7], [.26, 1.725], [0, 1.73]].map(([x, y]) => new THREE.Vector2(x, y));
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 128), pe);
  cuerpo.castShadow = true; tanque.add(cuerpo);

  // ---- Líquido: se regenera según el nivel ----
  const liquido = new THREE.Mesh(new THREE.BufferGeometry(), cerveza); tanque.add(liquido);
  function nivel(hh) {
    const pts = [new THREE.Vector2(0, .03)];
    for (let i = 0; i <= 28; i++) { const y = .03 + (hh - .03) * i / 28; pts.push(new THREE.Vector2(radio(y) * .955, y)); }
    pts.push(new THREE.Vector2(0, hh));
    liquido.geometry.dispose();
    liquido.geometry = new THREE.LatheGeometry(pts, 96);
  }
  // Volumen aproximado del cónico Ø 970 lleno hasta la altura y (escala: 1.730 L con el tanque lleno)
  const litrosA = y => Math.round(1750 * Math.min(1, Math.max(0, (y - .03) / (1.6 - .03)) ** 1.08));

  // ---- Tapa ----
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .11, 64), verde);
  tapa.position.y = 1.78; tapa.castShadow = true; tanque.add(tapa);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(.215, .018, 16, 64), verde);
  aro.rotation.x = Math.PI / 2; aro.position.y = 1.735; tanque.add(aro);

  // ---- Base metálica ----
  function tubo(a, b, r, mat = acero) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 20), mat);
    m.position.copy(va).add(vb).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    m.castShadow = true; tanque.add(m); return m;
  }
  const anillo = (r, y, g) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, g, 16, 128), acero); t.rotation.x = Math.PI / 2; t.position.y = y; t.castShadow = true; tanque.add(t); };
  anillo(.515, .56, .024);
  anillo(.6, -.12, .016);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    tubo([.515 * c, .56, .515 * s], [.66 * c, -.5, .66 * s], .022);
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .012, 24), acero);
    pie.position.set(.66 * c, -.494, .66 * s); tanque.add(pie);
  }

  // ---- Salidas CLAMP ----
  const ferula = (pos, rotZ) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .025, 40), acero);
    f.position.set(...pos); f.rotation.z = rotZ; tanque.add(f);
    const ab = new THREE.Mesh(new THREE.TorusGeometry(.07, .012, 12, 40), acero);
    ab.position.set(...pos); ab.rotation.set(rotZ ? 0 : Math.PI / 2, rotZ ? Math.PI / 2 : 0, 0); tanque.add(ab);
  };
  tubo([0, .02, 0], [0, -.2, 0], .035); ferula([0, -.2, 0], 0);
  const valvula = new THREE.Mesh(new THREE.BoxGeometry(.12, .1, .1), acero); valvula.position.set(0, -.28, 0); tanque.add(valvula);
  tubo([.12, -.28, 0], [-.12, -.28, 0], .015);
  tubo([.49, .9, 0], [.68, .9, 0], .032); ferula([.68, .9, 0], Math.PI / 2);

  // ---- Luces y piso ----
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e8ed, .6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(3, 6, 4); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 }); sol.shadow.radius = 6;
  scene.add(sol);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .14 }));
  piso.rotation.x = -Math.PI / 2; piso.position.y = -.5; piso.receiveShadow = true; scene.add(piso);

  // ---- Puntos de interés (etiquetas HTML sobre el 3D) ----
  const puntos = {
    tapa: new THREE.Vector3(0, 1.84, 0),
    clamp: new THREE.Vector3(.72, .9, 0),
    valvula: new THREE.Vector3(0, -.3, 0)
  };
  const etiquetas = [...escena.querySelectorAll(".punto")];
  const v = new THREE.Vector3(), dirCam = new THREE.Vector3();

  function ajustar() {
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // En pantallas angostas se aleja la cámara para que entre el tanque completo
    camera.fov = w < 600 ? 34 : 28;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(lienzo); ajustar();

  // ---- Animación de llenado ----
  const nivelTxt = document.getElementById("nivel-3d");
  let h = .05; const hFin = 1.32, t0 = performance.now();
  nivel(h);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(escena);

  function cuadro(t) {
    requestAnimationFrame(cuadro);
    if (!visible) return;
    if (h < hFin) {
      const p = reducir ? 1 : Math.min(1, (t - t0 - 400) / 2600);
      if (p > 0) { h = .05 + (hFin - .05) * (1 - Math.pow(1 - p, 3)); nivel(h); nivelTxt.textContent = litrosA(h).toLocaleString("es-AR") + " L"; }
    }
    controls.update();
    renderer.render(scene, camera);
    camera.getWorldDirection(dirCam);
    const w = lienzo.clientWidth, hh = lienzo.clientHeight;
    etiquetas.forEach(el => {
      const p = puntos[el.dataset.p];
      v.copy(p).applyMatrix4(tanque.matrixWorld);
      const detras = v.clone().sub(camera.position).normalize().dot(dirCam) < 0;
      // La salida lateral se oculta cuando queda del lado de atrás del tanque
      const oculta = el.dataset.p === "clamp" && v.clone().setY(0).normalize().dot(camera.position.clone().setY(0).normalize()) < -.15;
      v.project(camera);
      el.style.transform = `translate(${(v.x * .5 + .5) * w - 7}px, ${(-v.y * .5 + .5) * hh - 7}px)`;
      el.style.visibility = detras || oculta ? "hidden" : "visible";
    });
  }
  requestAnimationFrame(cuadro);
  escena.classList.add("listo");
} catch (err) {
  console.warn("Escena 3D no disponible, se muestra la ilustración.", err);
}
