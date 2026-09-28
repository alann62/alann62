// Anatomía 3D de una red contra incendio (Three.js), atada al scroll con GSAP ScrollTrigger.
// Pasos: humo -> detector -> bomba y agua por la cañería -> rociadores apagan el fuego -> vista general.
// Empaquetar: npx esbuild src/escena.js --bundle --minify --format=iife --outfile=js/escena.js
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const REDUCIR = matchMedia("(prefers-reduced-motion: reduce)").matches;
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mezclar = (a, b, t) => a + (b - a) * t;
function tramo(claves, p) {
  if (p <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [p1, v1] = claves[i], [p0, v0] = claves[i - 1];
    if (p <= p1) { const t = suave(p0, p1, p); return Array.isArray(v0) ? v0.map((v, k) => mezclar(v, v1[k], t)) : mezclar(v0, v1, t); }
  }
  return claves[claves.length - 1][1];
}

function iniciar() {
  const seccion = document.getElementById("anatomia");
  const lienzo = document.getElementById("anat-lienzo");
  if (!seccion || !lienzo) return;

  // ---------- Motor ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  lienzo.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1b2229, .5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.3);
  sol.position.set(5, 9, 6); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 30 }); sol.shadow.radius = 5;
  scene.add(sol);
  const camera = new THREE.PerspectiveCamera(32, 1, .05, 100);
  function ajustar() {
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Escritorio: la escena a la derecha de los textos. Celular: arriba de la tarjeta de texto.
    if (w > 760) camera.setViewOffset(w, h, -w * .2, 0, w, h); else camera.setViewOffset(w, h, 0, h * .14, w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(lienzo); ajustar();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(lienzo);

  // ---------- Materiales ----------
  const M = {
    piso: new THREE.MeshStandardMaterial({ color: 0x2a323b, roughness: .9 }),
    muro: new THREE.MeshStandardMaterial({ color: 0x323b45, roughness: .95 }),
    rojo: new THREE.MeshStandardMaterial({ color: 0xc8352a, roughness: .42, metalness: .3 }),
    acero: new THREE.MeshStandardMaterial({ color: 0xd3d8dc, metalness: 1, roughness: .28 }),
    tablero: new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: .5 }),
    blanco: new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: .4 }),
    led: new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a1a, emissiveIntensity: 0 }),
    fuego: new THREE.MeshBasicMaterial({ color: 0xffa530, transparent: true, opacity: .9 }),
    agua: new THREE.MeshBasicMaterial({ color: 0x7fd3ff })
  };

  // ---------- Nave (corte) ----------
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M.piso);
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; scene.add(piso);
  const muroFondo = new THREE.Mesh(new THREE.BoxGeometry(14, 4, .2), M.muro);
  muroFondo.position.set(0, 2, -3.6); muroFondo.receiveShadow = true; scene.add(muroFondo);
  const muroLado = new THREE.Mesh(new THREE.BoxGeometry(.2, 4, 7.2), M.muro);
  muroLado.position.set(-5.2, 2, 0); muroLado.receiveShadow = true; scene.add(muroLado);
  // Estanterías de un depósito para dar escala
  for (const x of [-.6, 1.8]) for (const z of [-2.2, 1.9]) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, .6), new THREE.MeshStandardMaterial({ color: 0x3f4a56, roughness: .8 }));
    rack.position.set(x, .65, z); rack.castShadow = true; rack.receiveShadow = true; scene.add(rack);
  }

  function tubo(a, b, r, mat = M.rojo) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 18), mat);
    m.position.copy(va).add(vb).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    m.castShadow = true; scene.add(m); return m;
  }

  // ---------- Sala de bombas ----------
  const bomba = new THREE.Group(); bomba.position.set(-4.2, 0, 1.6); scene.add(bomba);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, .12, .6), M.acero); base.position.y = .06; bomba.add(base);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .6, 32), M.rojo);
  motor.rotation.z = Math.PI / 2; motor.position.set(-.25, .38, 0); motor.castShadow = true; bomba.add(motor);
  const voluta = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .2, 32), M.rojo);
  voluta.rotation.x = Math.PI / 2; voluta.position.set(.35, .38, 0); voluta.castShadow = true; bomba.add(voluta);
  const ventilador = new THREE.Mesh(new THREE.BoxGeometry(.04, .36, .06), M.acero);
  ventilador.position.set(-.57, .38, 0); bomba.add(ventilador);
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(.5, .7, .18), M.tablero);
  tablero.position.set(-.3, 1.2, -.45); tablero.castShadow = true; bomba.add(tablero);
  const luzBomba = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 12), new THREE.MeshStandardMaterial({ color: 0x003300, emissive: 0x31ff6a, emissiveIntensity: 0 }));
  luzBomba.position.set(-.3, 1.4, -.35); bomba.add(luzBomba);

  // Foco de fuego en el pasillo central, a la vista
  const FOCO = new THREE.Vector3(.7, 0, .15);

  // ---------- Red de cañerías ----------
  const Y = 3.2;                                   // altura del ramal principal
  const X0 = -3.85, Z0 = 1.6;
  tubo([X0, .38, Z0], [X0, Y, Z0], .075);          // montante desde la bomba
  tubo([X0, Y, Z0], [X0, Y, 0], .075);
  tubo([X0, Y, 0], [3.4, Y, 0], .075);             // principal
  const ramalesX = [-2.2, -.2, 1.8, 3.4];
  const rociadores = [];
  for (const x of ramalesX) {
    tubo([x, Y, -2.6], [x, Y, 2.6], .045);
    for (const z of [-2.1, -.7, .7, 2.1]) {
      const bajada = tubo([x, Y, z], [x, Y - .18, z], .018, M.acero);
      const cabeza = new THREE.Mesh(new THREE.ConeGeometry(.07, .08, 16), M.acero);
      cabeza.position.set(x, Y - .22, z); scene.add(cabeza);
      const bulbo = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xff2010, emissiveIntensity: .6 }));
      bulbo.position.set(x, Y - .17, z); scene.add(bulbo);
      rociadores.push({ pos: new THREE.Vector3(x, Y - .26, z), bulbo, bajada });
    }
  }

  // Solo se activan los rociadores cuyo bulbo alcanza la temperatura: los cercanos al foco
  const cercaDelFuego = r => Math.hypot(r.pos.x - FOCO.x, r.pos.z - FOCO.z) < 1.6;
  const activos = rociadores.filter(cercaDelFuego);

  // ---------- Detector de humo ----------
  const detector = new THREE.Group(); detector.position.set(.9, Y + .15, .75); scene.add(detector);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, .07, 32), M.blanco); detector.add(disco);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 12), M.led); led.position.set(.08, -.04, .08); detector.add(led);

  // ---------- Fuego ----------
  const origen = FOCO.clone();
  const fuego = new THREE.Group(); fuego.position.copy(origen); scene.add(fuego);
  const llamas = [0, 1, 2].map(i => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(.18 - i * .04, .6 - i * .12, 16), M.fuego.clone());
    m.material.color.setHex([0xff7a1a, 0xffa530, 0xffe08a][i]); m.position.y = .3 - i * .05; fuego.add(m); return m;
  });
  const luzFuego = new THREE.PointLight(0xff8a2a, 0, 6); luzFuego.position.set(origen.x, .6, origen.z); scene.add(luzFuego);

  // ---------- Partículas: humo y agua ----------
  // Textura redonda y difusa para que las partículas no se vean cuadradas
  const puntoSuave = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  function particulas(n, color, tam, opacidad) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.PointsMaterial({ color, size: tam, map: puntoSuave, transparent: true, opacity: opacidad, depthWrite: false });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;   // las posiciones cambian cada cuadro: sin esto Three.js las descarta por su caja inicial
    scene.add(p);
    return { p, pos: geo.attributes.position, vel: new Float32Array(n * 3), vida: new Float32Array(n).fill(-1), n };
  }
  const humo = particulas(320, 0xb4bcc5, .55, .35);
  const agua = particulas(1400, 0xcdefff, .11, .9);

  // Gotas de agua que recorren la cañería (bomba -> ramales)
  const recorrido = [[X0, .38, Z0], [X0, Y, Z0], [X0, Y, 0], [3.4, Y, 0]].map(v => new THREE.Vector3(...v));
  const largos = recorrido.slice(1).map((v, i) => v.distanceTo(recorrido[i]));
  const total = largos.reduce((a, b) => a + b, 0);
  function puntoEn(t) {
    let d = t * total;
    for (let i = 0; i < largos.length; i++) { if (d <= largos[i]) return recorrido[i].clone().lerp(recorrido[i + 1], d / largos[i]); d -= largos[i]; }
    return recorrido[recorrido.length - 1].clone();
  }
  const cuentas = Array.from({ length: 26 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 10), M.agua); m.visible = false; scene.add(m);
    return { m, t: i / 26 };
  });

  // ---------- Estado según el scroll ----------
  const etiquetas = [...seccion.querySelectorAll(".punto")];
  const puntos = { detector: detector.position.clone().add(new THREE.Vector3(0, -.12, 0)), bomba: new THREE.Vector3(-4.2, 1.1, 1.6), rociador: activos[0].pos.clone() };
  const pasos = [...seccion.querySelectorAll(".paso-a")];
  const cortes = [0, .16, .36, .58, .8];
  // Cámara: vista general -> detector y humo -> sala de bombas -> rociadores sobre el fuego -> vista general
  const camPos = [[0, [11, 8, 14]], [.2, [8.5, 3.2, 1.6]], [.38, [2.2, 3.4, 10]], [.6, [8, 2.4, 2.2]], [.8, [11.5, 8.5, 15]], [1, [12, 9.5, 16]]];
  const camObj = [[0, [-.4, 1.4, 0]], [.2, [.6, 1.7, .1]], [.38, [-2.8, 1.6, .9]], [.6, [.6, 1.3, .1]], [.8, [-.4, 1.4, 0]], [1, [-.4, 1.3, 0]]];

  let progreso = 0, activo = -1;
  const E = { humo: 0, alarma: 0, bomba: 0, flujo: 0, rocio: 0, fuego: 1 };
  function estado(p) {
    progreso = p;
    E.humo = suave(.12, .24, p) * (1 - suave(.66, .78, p));
    E.alarma = suave(.2, .28, p);
    E.bomba = suave(.36, .42, p);
    E.flujo = suave(.38, .56, p);
    E.rocio = suave(.58, .64, p) * (1 - suave(.86, .95, p));
    E.fuego = 1 - suave(.62, .76, p);
    camera.position.set(...tramo(camPos, p));
    camera.lookAt(...tramo(camObj, p));
    let i = 0; cortes.forEach((c, k) => { if (p >= c) i = k; });
    if (i !== activo) { activo = i; pasos.forEach((el, k) => el.classList.toggle("activo", k === i)); }
  }

  if (!REDUCIR && window.gsap && window.ScrollTrigger) {
    window.ScrollTrigger.create({ trigger: seccion, start: "top top", end: "+=3400", pin: ".anat-pin", scrub: .5, refreshPriority: 1, onUpdate: s => estado(s.progress) });
    window.ScrollTrigger.sort(); window.ScrollTrigger.refresh();
    estado(0);
  } else {
    seccion.classList.add("estatico");
    estado(.66);
  }
  seccion.classList.add("listo");

  // ---------- Animación continua ----------
  const v = new THREE.Vector3(), dir = new THREE.Vector3();
  let tAnt = performance.now();
  function cuadro(t) {
    requestAnimationFrame(cuadro);
    if (!visible) { tAnt = t; return; }
    const dt = Math.min(.05, (t - tAnt) / 1000); tAnt = t;
    const seg = t / 1000;

    // Fuego que titila y se apaga con el agua
    fuego.scale.setScalar(Math.max(.001, E.fuego) * (1 + Math.sin(seg * 17) * .06));
    llamas.forEach((l, i) => { l.scale.y = 1 + Math.sin(seg * (9 + i * 3) + i) * .12; });
    luzFuego.intensity = E.fuego * (2.2 + Math.sin(seg * 23) * .5);

    // Detector: LED que parpadea en alarma
    M.led.emissiveIntensity = E.alarma * (Math.sin(seg * 12) > 0 ? 3 : .2);
    // Bomba: luz verde y vibración
    luzBomba.material.emissiveIntensity = E.bomba * 2.5;
    ventilador.rotation.x += E.bomba * dt * 40;
    bomba.position.y = E.bomba * Math.sin(seg * 60) * .004;

    // Agua dentro de la cañería
    cuentas.forEach(c => {
      c.t = (c.t + dt * .35 * E.bomba) % 1;
      c.m.visible = E.flujo > .02 && c.t <= E.flujo;
      if (c.m.visible) c.m.position.copy(puntoEn(c.t));
    });
    // Bulbos que se rompen cuando rocían
    activos.forEach(r => { r.bulbo.visible = E.rocio < .1; });

    // Humo: nace en el fuego y sube hasta el techo
    const ph = humo.pos.array;
    for (let i = 0; i < humo.n; i++) {
      if (humo.vida[i] < 0) {
        if (Math.random() < E.humo * .35) {
          humo.vida[i] = 0;
          ph[i * 3] = origen.x + (Math.random() - .5) * .3; ph[i * 3 + 1] = .5; ph[i * 3 + 2] = origen.z + (Math.random() - .5) * .3;
          humo.vel[i * 3] = (Math.random() - .5) * .25; humo.vel[i * 3 + 1] = .7 + Math.random() * .5; humo.vel[i * 3 + 2] = (Math.random() - .5) * .25;
        } else { ph[i * 3 + 1] = -50; continue; }
      }
      humo.vida[i] += dt;
      ph[i * 3] += humo.vel[i * 3] * dt; ph[i * 3 + 1] += humo.vel[i * 3 + 1] * dt; ph[i * 3 + 2] += humo.vel[i * 3 + 2] * dt;
      if (ph[i * 3 + 1] > Y - .1) { humo.vel[i * 3 + 1] = 0; humo.vel[i * 3] *= 1.02; humo.vel[i * 3 + 2] *= 1.02; }
      if (humo.vida[i] > 5) { humo.vida[i] = -1; ph[i * 3 + 1] = -50; }
    }
    humo.pos.needsUpdate = true;

    // Agua: conos de rocío desde cada rociador
    const pa = agua.pos.array;
    for (let i = 0; i < agua.n; i++) {
      if (agua.vida[i] < 0) {
        if (Math.random() < E.rocio * .5) {
          const r = activos[i % activos.length].pos;
          const ang = Math.random() * Math.PI * 2, abre = .6 + Math.random() * 1.2;
          agua.vida[i] = 0;
          pa[i * 3] = r.x; pa[i * 3 + 1] = r.y; pa[i * 3 + 2] = r.z;
          agua.vel[i * 3] = Math.cos(ang) * abre; agua.vel[i * 3 + 1] = -.3 - Math.random() * .8; agua.vel[i * 3 + 2] = Math.sin(ang) * abre;
        } else { pa[i * 3 + 1] = -50; continue; }
      }
      agua.vida[i] += dt;
      agua.vel[i * 3 + 1] -= 9.8 * dt * .6;
      pa[i * 3] += agua.vel[i * 3] * dt; pa[i * 3 + 1] += agua.vel[i * 3 + 1] * dt; pa[i * 3 + 2] += agua.vel[i * 3 + 2] * dt;
      if (pa[i * 3 + 1] < .02) { agua.vida[i] = -1; pa[i * 3 + 1] = -50; }
    }
    agua.pos.needsUpdate = true;

    renderer.render(scene, camera);

    // Etiquetas sobre el 3D, solo en su paso
    const w = lienzo.clientWidth, h = lienzo.clientHeight, p = progreso;
    const activas = { detector: p > .14 && p < .36, bomba: p > .34 && p < .58, rociador: p > .56 && p < .8 };
    camera.getWorldDirection(dir);
    etiquetas.forEach(el => {
      const k = el.dataset.p, pt = puntos[k];
      if (!pt || !activas[k]) { el.style.visibility = "hidden"; return; }
      v.copy(pt);
      const detras = v.clone().sub(camera.position).dot(dir) < 0;
      v.project(camera);
      el.style.transform = `translate(${(v.x * .5 + .5) * w - 7}px, ${(-v.y * .5 + .5) * h - 7}px)`;
      el.style.visibility = detras ? "hidden" : "visible";
    });
  }
  requestAnimationFrame(cuadro);
}

try { iniciar(); } catch (err) { console.warn("3D no disponible, queda la foto.", err); }
