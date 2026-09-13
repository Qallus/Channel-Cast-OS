"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type * as THREE_NS from "three";

import { buildDevice, buildSound, type THREE } from "@/components/site/device-model";


type SceneOpts = {
  /** Multiplier on the fitted camera distance — smaller frames the device larger. */
  framing: number;
  /** Fraction of the bounding radius to pan the view up by, dropping the device in frame. */
  lift: number;
  /** When false the model still turns on its own, but the pointer can't grab it. */
  interactive?: boolean;
};

/* Builds the whole scene into `host` and returns a disposer. Shared by the
   inline hero view and the lightbox so both stay in sync. */
async function mountDevice(host: HTMLElement, opts: SceneOpts): Promise<(() => void) | "nowebgl"> {
  const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
  ]);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer: THREE_NS.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return "nowebgl";
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
  // Ambient turntable only — no dragging, for the places that embed the model
  // as an illustration rather than something to handle.
  controls.enableRotate = opts.interactive !== false;

  // Pause the turntable while someone is dragging, then pick it back up a
  // moment after they let go — it should never stay stopped for good.
  let resume: ReturnType<typeof setTimeout> | undefined;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    if (resume) clearTimeout(resume);
  });
  controls.addEventListener("end", () => {
    if (reduce) return;
    if (resume) clearTimeout(resume);
    resume = setTimeout(() => { controls.autoRotate = true; }, 2500);
  });

  const dist = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * opts.framing;
  camera.position.copy(sphere.center).add(new THREE.Vector3(1, 0.42, 1.3).normalize().multiplyScalar(dist));
  controls.target.copy(sphere.center);
  // Lift camera and target together so the view pans up and the device sits
  // lower in frame, clear of any overlay. Keep it modest: the device's lowest
  // point lands at roughly 0.5 + (lift / framing) * 0.5 + 0.26 / framing of the
  // canvas height, so an aggressive lift crops the mount off the bottom edge.
  const lift = sphere.radius * opts.lift;
  camera.position.y += lift;
  controls.target.y += lift;
  controls.update();

  // Half the frame's width in world units at the device — the rings' budget.
  let reach = 0.2;
  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * dist;
    reach = halfH * camera.aspect * 0.95;
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
      sound.update(t, reach);
      brandMat.emissiveIntensity = 0.55 + Math.abs(Math.sin(t * 1.6)) * 0.9;
    }
    controls.update();
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    if (resume) clearTimeout(resume);
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
}


/* One mounted scene, torn down on unmount. Split out so the inline hero view
   and the lightbox can each own an independent canvas. */
function useDeviceScene(
  ref: React.RefObject<HTMLDivElement | null>,
  opts: SceneOpts,
  active: boolean,
  onFail: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const host = ref.current;
    if (!host) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // three.js is ~600 KB — load it after the hero paints, never during SSR.
    mountDevice(host, opts).then((result) => {
      if (result === "nowebgl") {
        onFail(); // the still fallback stands on its own
        return;
      }
      if (disposed) {
        result();
        return;
      }
      cleanup = result;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

export function Device3D({
  className,
  framing = 1.15,
  lift = 0.3,
  interactive = true,
  wide = true,
}: {
  className?: string;
  /** Multiplier on the fitted camera distance — smaller frames the device larger. */
  framing?: number;
  /** Fraction of the bounding radius to drop the device by, clearing an overlay. */
  lift?: number;
  /** Off = ambient turntable only: no drag, no zoom, no chips. */
  interactive?: boolean;
  /** Let the canvas spill past its column on large screens, for the sound rings. */
  wide?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useDeviceScene(hostRef, { framing, lift, interactive }, true, () => setFailed(true));
  // Centred and framed tighter — the lightbox has the whole viewport to work with.
  useDeviceScene(zoomRef, { framing: 1.05, lift: 0 }, zoomed, () => setFailed(true));

  // Click opens the lightbox, drag rotates: tell them apart by how far the
  // pointer travelled, so a rotate never ends in an unwanted zoom.
  useEffect(() => {
    if (!interactive) return;
    const host = hostRef.current;
    if (!host) return;
    let x = 0;
    let y = 0;
    let t = 0;
    const down = (e: PointerEvent) => { x = e.clientX; y = e.clientY; t = Date.now(); };
    const up = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - x, e.clientY - y) < 6 && Date.now() - t < 500) setZoomed(true);
    };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointerup", up);
    return () => {
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointerup", up);
    };
  }, [interactive]);

  // Close on Escape, and hold the page still while the lightbox is open.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoomed(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoomed]);

  // No card chrome: the device sits straight on the section, lit only by a
  // soft brand wash so it reads as the product rather than another tile.
  return (
    <>
      <div className={`pointer-events-none absolute inset-0 ${className ?? ""}`}>
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_62%,hsl(var(--brand)/0.14),transparent_72%)]" />
        {/* Wider than its column on large screens so the sound rings have room
            to travel — the column alone crops them. */}
        <div
          ref={hostRef}
          className={`absolute inset-y-0 left-1/2 w-full -translate-x-1/2 ${wide ? "lg:w-[130%]" : ""} ${
            interactive ? "pointer-events-auto cursor-grab touch-pan-y active:cursor-grabbing" : ""
          }`}
          role="img"
          aria-label="A 3D model of the Channel Cast playback device: a weatherproof puck speaker with a centered AI vision camera, on a ceiling mount."
        />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-muted-foreground">
            The interactive device model needs WebGL.
          </div>
        )}
        {/* inset-x-0 rather than left-1/2: anchoring at the midpoint leaves the
            row only half the width to sit in, which wraps both labels on phones.
            Matched fixed widths keep the two pills the same size. */}
        {interactive && (
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 px-4">
            <span className="w-[8.5rem] whitespace-nowrap rounded-full bg-brand/15 px-2.5 py-1 text-center text-[11px] font-medium text-brand-strong">
              Drag to rotate
            </span>
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className="pointer-events-auto w-[8.5rem] whitespace-nowrap rounded-full bg-brand/15 px-2.5 py-1 text-center text-[11px] font-medium text-brand-strong transition hover:bg-brand/25"
            >
              Click to zoom
            </button>
          </div>
        )}
      </div>

      {/* Portalled to <body>: the hero's cc-float transform would otherwise
          become the containing block and trap this "fixed" overlay inside the
          column instead of covering the viewport. */}
      {zoomed && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Channel Cast playback device, enlarged"
          onClick={() => setZoomed(false)}
        >
          <div className="relative h-full max-h-[90vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_50%,hsl(var(--brand)/0.14),transparent_72%)]" />
            <div
              ref={zoomRef}
              className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
              role="img"
              aria-label="Enlarged 3D model of the Channel Cast playback device."
            />
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="absolute right-0 top-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg transition hover:bg-accent"
            >
              Close
            </button>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-brand/15 px-2.5 py-0.5 text-[11px] font-medium text-brand-strong">
              Drag to rotate · Esc to close
            </span>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
