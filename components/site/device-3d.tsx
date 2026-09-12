"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";

type THREE = typeof THREE_NS;

/* Builds the Channel Cast playback device: a weatherproof puck speaker with a
   centered AI-vision camera pod, on its ceiling/wall mount. Real-world meters,
   y-up, base at y=0 — ported from the enclosure model in docs/three.js. */
function buildDevice(THREE: THREE, accent: number): THREE_NS.Group {
  const matteBlack = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.38, metalness: 0.55 });
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x44484f, roughness: 0.36, metalness: 0.6 });
  // The mount is the same alloy but deliberately darker: its plate is a flat
  // disc facing the key light, so at the housing's value it blows out and
  // out-reads the speaker itself.
  const mountMetal = new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.52, metalness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8d9298, roughness: 0.3, metalness: 0.6 });
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9, metalness: 0.2 });
  const meshMat = new THREE.MeshStandardMaterial({ color: 0x34363a, roughness: 0.32, metalness: 0.6 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.55 });
  const innerLensMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.12, metalness: 0.45, emissive: 0x0a1018 });
  const lensBarrelMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.3, metalness: 0.45 });
  // Brand lime, self-lit — the one spot of colour on the device.
  const brandMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.1 });

  const g = new THREE.Group();
  g.name = "puck_speaker_cam";
  const mesh = (geo: THREE_NS.BufferGeometry, mat: THREE_NS.Material, name: string) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    g.add(m);
    return m;
  };

  const R = 0.095; // puck radius (190 mm dia — fits a 6" driver)
  const H = 0.062; // puck height

  // ---- mount: plate, screw bosses, riser stem, ball joint, yoke ----
  const plate = mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.008, 40), mountMetal, "mount_plate");
  plate.position.y = 0.004;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const s = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.0022, 16), matteBlack, `mount_screw_${i}`);
    s.position.set(Math.cos(a) * 0.04, 0.0092, Math.sin(a) * 0.04);
  }
  mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.03, 24), mountMetal, "mount_stem").position.y = 0.023;
  mesh(new THREE.SphereGeometry(0.016, 28, 20), matteBlack, "ball_joint").position.y = 0.05;
  const collar = mesh(new THREE.TorusGeometry(0.0135, 0.0035, 14, 32), steel, "lock_collar");
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.04;
  mesh(new THREE.CylinderGeometry(0.017, 0.024, 0.014, 28), mountMetal, "yoke_clevis").position.y = 0.063;

  // ---- puck body ----
  const puckY = 0.07 + H / 2;
  mesh(new THREE.CylinderGeometry(R, R * 0.94, H, 56), matteBlack, "hull").position.y = puckY;
  mesh(new THREE.CylinderGeometry(R * 0.94 + 0.001, R * 0.86, 0.016, 56), gunmetal, "back_cap").position.y = 0.078;
  const reveal = mesh(new THREE.TorusGeometry(R - 0.0015, 0.0018, 12, 72), steel, "reveal_ring");
  reveal.rotation.x = Math.PI / 2;
  reveal.position.y = 0.07 + H - 0.006;

  // ---- face: bezel, perforated grille, trim ----
  const faceY = 0.07 + H;
  const bezel = mesh(new THREE.TorusGeometry(R * 0.93, 0.005, 16, 72), gunmetal, "face_bezel");
  bezel.rotation.x = Math.PI / 2;
  bezel.position.y = faceY - 0.001;
  mesh(new THREE.CylinderGeometry(R * 0.88, R * 0.88, 0.004, 56), meshMat, "grille_disc").position.y = faceY + 0.001;

  // Perforations: hex-packed holes over the grille annulus, one instanced mesh.
  const holeGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.0012, 8);
  const holeR = 0.0016;
  const pitch = 0.0052;
  const innerKeep = 0.0265; // stay clear of the camera pod
  const outerKeep = R * 0.88 - 0.004;
  const holes: [number, number][] = [];
  let row = 0;
  for (let z = -outerKeep; z <= outerKeep; z += pitch * 0.866) {
    const off = (row++ % 2) * (pitch / 2);
    for (let x = -outerKeep + off; x <= outerKeep; x += pitch) {
      const d = Math.hypot(x, z);
      if (d < innerKeep + holeR || d > outerKeep - holeR) continue;
      holes.push([x, z]);
    }
  }
  const holeMesh = new THREE.InstancedMesh(holeGeo, grilleMat, holes.length);
  holeMesh.name = "grille_perforations";
  const m4 = new THREE.Matrix4();
  holes.forEach(([x, z], i) => {
    m4.setPosition(x, faceY + 0.0032, z);
    holeMesh.setMatrixAt(i, m4);
  });
  g.add(holeMesh);

  const trim = mesh(new THREE.TorusGeometry(R * 0.88, 0.0014, 10, 72), steel, "grille_trim");
  trim.rotation.x = Math.PI / 2;
  trim.position.y = faceY + 0.0025;

  // ---- AI vision camera pod ----
  const podR = 0.024;
  mesh(new THREE.CylinderGeometry(podR, podR + 0.003, 0.017, 40), gunmetal, "camera_pod").position.y = faceY + 0.0085;
  mesh(new THREE.CylinderGeometry(podR + 0.004, podR + 0.0075, 0.005, 36), gunmetal, "pod_base").position.y = faceY + 0.0025;
  mesh(new THREE.CylinderGeometry(0.0145, 0.0155, 0.006, 40), lensBarrelMat, "retaining_ring").position.y = faceY + 0.018;
  for (let i = 0; i < 5; i++) {
    const groove = mesh(new THREE.TorusGeometry(0.0148, 0.0003, 8, 48), gunmetal, `barrel_groove_${i}`);
    groove.rotation.x = Math.PI / 2;
    groove.position.y = faceY + 0.0152 + i * 0.0012;
  }
  mesh(new THREE.CylinderGeometry(0.0125, 0.0135, 0.005, 36), lensBarrelMat, "lens_barrel").position.y = faceY + 0.0225;
  mesh(new THREE.CylinderGeometry(0.01, 0.011, 0.004, 32), matteBlack, "lens_throat").position.y = faceY + 0.0255;
  for (let i = 0; i < 6; i++) {
    const ering = mesh(new THREE.TorusGeometry(0.0098 - i * 0.0009, 0.00042, 8, 44), i % 2 === 0 ? lensBarrelMat : steel, `element_ring_${i}`);
    ering.rotation.x = Math.PI / 2;
    ering.position.y = faceY + 0.0268 + i * 0.0006;
  }
  const element = mesh(new THREE.SphereGeometry(0.0068, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), innerLensMat, "lens_element");
  element.scale.y = 0.55;
  element.position.y = faceY + 0.0284;
  const pupilRing = mesh(new THREE.TorusGeometry(0.0042, 0.0004, 8, 32), steel, "pupil_ring");
  pupilRing.rotation.x = Math.PI / 2;
  pupilRing.position.y = faceY + 0.0312;
  mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.0008, 20), new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.05, metalness: 0.2 }), "lens_pupil").position.y = faceY + 0.0314;
  const cover = mesh(new THREE.SphereGeometry(podR * 0.92, 36, 24, 0, Math.PI * 2, 0, Math.PI / 2), lensMat, "glass_cover");
  cover.scale.y = 0.72;
  cover.position.y = faceY + 0.016;

  // Status LED — the "live" tell, pulsed by the animation loop.
  const led = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0016, 14), brandMat, "status_led");
  led.position.set(podR * 0.62, faceY + 0.0142, podR * 0.55);

  // ---- weatherproofing details ----
  const gasket = mesh(new THREE.TorusGeometry(R * 0.945, 0.0016, 10, 72), gunmetal, "gasket_seam");
  gasket.rotation.x = Math.PI / 2;
  gasket.position.y = 0.084;
  const gland = mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.012, 20), matteBlack, "cable_gland");
  gland.rotation.z = Math.PI / 2;
  gland.position.set(-(R * 0.86), 0.082, 0);
  const lip = mesh(new THREE.TorusGeometry(R * 0.985, 0.0022, 10, 72), matteBlack, "drip_lip");
  lip.rotation.x = Math.PI / 2;
  lip.position.y = faceY - 0.0005;

  g.userData = { brandMat, faceY };
  return g;
}

/* Concentric rings rippling out from the grille — the device "playing". */
function buildSound(THREE: THREE, accent: number, y: number) {
  const group = new THREE.Group();
  group.position.y = y;
  // Unit-radius torus, scaled per frame — see the framing note in Device3D.
  const geo = new THREE.TorusGeometry(1, 0.0035, 8, 72);
  const rings = [0, 1, 2].map((i) => {
    const mat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false });
    const r = new THREE.Mesh(geo, mat);
    r.rotation.x = -Math.PI / 2;
    r.userData = { off: i / 3, mat };
    group.add(r);
    return r;
  });
  return {
    group,
    update(t: number) {
      rings.forEach((r) => {
        const p = (t * 0.45 + r.userData.off) % 1;
        // Start just outside the 0.095 m puck radius, or the ring clips the hull.
        const s = 0.105 + p * 0.115;
        r.scale.set(s, s, 1);
        // Fade in off the grille edge, then out — no hard pop at the rim.
        (r.userData.mat as THREE_NS.MeshBasicMaterial).opacity = Math.min(1, p * 6) * (1 - p) * 0.4;
      });
    },
  };
}

export function Device3D({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // three.js is ~600 KB — load it after the hero paints, never during SSR.
    (async () => {
      const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      if (disposed) return;

      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

      let renderer: THREE_NS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setFailed(true); // no WebGL — the still fallback stands on its own
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.classList.add("block", "h-full", "w-full");
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();

      // A room environment gives the metal something to reflect — without it,
      // high-metalness materials render near-black.
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      // Held well under 1 — at full strength the room blows the gunmetal mount
      // out to near-white and it pulls focus from the speaker.
      scene.environmentIntensity = 0.55;

      const accent = 0xc6ff00; // --brand
      const device = buildDevice(THREE, accent);
      device.traverse((o) => {
        if ((o as THREE_NS.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      scene.add(device);

      // Frame to the hardware alone — measured before the sound rings join it,
      // since those are unit-radius geometry scaled down per frame and would
      // otherwise blow the bounds up to ~2 m.
      const box = new THREE.Box3().setFromObject(device);
      const sphere = box.getBoundingSphere(new THREE.Sphere());

      const sound = buildSound(THREE, accent, device.userData.faceY + 0.01);
      device.add(sound.group);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1c18, 0.45));
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(0.35, 0.6, 0.4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0004;
      key.shadow.camera.left = -0.25;
      key.shadow.camera.right = 0.25;
      key.shadow.camera.top = 0.25;
      key.shadow.camera.bottom = -0.25;
      key.shadow.camera.near = 0.05;
      key.shadow.camera.far = 2;
      scene.add(key);
      // Cool fill from behind so the matte black keeps a readable silhouette.
      const fill = new THREE.DirectionalLight(0xdce6f0, 0.9);
      fill.position.set(-0.5, 0.3, -0.45);
      scene.add(fill);
      // No coloured light on the model: any lime lamp close enough to rim the
      // shell also washes the gunmetal mount. The brand glow is the CSS
      // gradient behind the canvas; on the device it stays the LED and rings.

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.22 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 20);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enableZoom = false; // never hijack page scroll
      controls.enablePan = false;
      controls.minPolarAngle = 0.35;
      controls.maxPolarAngle = Math.PI / 2 - 0.06;
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 1.1;
      controls.addEventListener("start", () => {
        controls.autoRotate = false;
      });

      // Three-quarter view from above, framed to the bounds measured earlier.
      const dist = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.06;
      camera.position.copy(sphere.center).add(new THREE.Vector3(1, 0.42, 1.3).normalize().multiplyScalar(dist));
      controls.target.copy(sphere.center);
      controls.update();

      const fit = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(host);

      // Only burn frames while the device is actually on screen.
      let visible = true;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(host);

      const clock = new THREE.Clock();
      const brandMat = device.userData.brandMat as THREE_NS.MeshStandardMaterial;
      renderer.setAnimationLoop(() => {
        if (!visible) return;
        const t = clock.getElapsedTime();
        if (!reduce) {
          sound.update(t);
          brandMat.emissiveIntensity = 0.55 + Math.abs(Math.sin(t * 1.6)) * 0.9;
        }
        controls.update();
        renderer.render(scene, camera);
      });

      cleanup = () => {
        renderer.setAnimationLoop(null);
        ro.disconnect();
        io.disconnect();
        controls.dispose();
        scene.traverse((o) => {
          const m = o as unknown as { geometry?: THREE_NS.BufferGeometry; material?: THREE_NS.Material | THREE_NS.Material[] };
          m.geometry?.dispose();
          if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => mm.dispose());
        });
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_15%,hsl(var(--brand)/0.10),transparent_70%)]" />
        <div
          ref={hostRef}
          className="relative h-56 w-full cursor-grab touch-pan-y active:cursor-grabbing sm:h-64"
          role="img"
          aria-label="A 3D model of the Channel Cast playback device: a weatherproof puck speaker with a centered AI vision camera, on a ceiling mount."
        />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-muted-foreground">
            The interactive device model needs WebGL.
          </div>
        )}
        <div className="relative flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">AI Vision Playback Device</p>
            <p className="text-xs text-muted-foreground">Weatherproof speaker · on-device camera · Dolby Digital audio</p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-strong sm:inline">
            Drag to rotate
          </span>
        </div>
      </div>
    </div>
  );
}
