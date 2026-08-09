"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type SceneVariant = "audio" | "displays" | "wall" | "street";
type Mode = "dark" | "light";
type Updater = (t: number, p: number) => void;

type Theme = {
  bg: number; amb: number; ambI: number; dirI: number; rimI: number;
  grid: [number, number]; gridOp: number; dust: number; dustOp: number;
  struct: number; structRough: number; structMetal: number;
  concrete: number; glassOp: number; face: number; faceFill: number; faceEdge: number;
  sweep: number; sweepOp: number; sweepBlend: number; ground: number; groundOp: number;
};

const THEMES: Record<Mode, Theme> = {
  dark: {
    bg: 0x050904, amb: 0x2c3a26, ambI: 1.2, dirI: 1.05, rimI: 3,
    grid: [0x243019, 0x131c0e], gridOp: 0.28, dust: 0x9fcb5a, dustOp: 0.4,
    struct: 0x161c13, structRough: 0.5, structMetal: 0.6, concrete: 0x11170f, glassOp: 0.35,
    face: 0xc6ff00, faceFill: 0.13, faceEdge: 0.42, sweep: 0xc6ff00, sweepOp: 0.42, sweepBlend: 2,
    ground: 0x0a0f08, groundOp: 0.8,
  },
  light: {
    bg: 0xf7f9f2, amb: 0xffffff, ambI: 1.55, dirI: 1.35, rimI: 1.1,
    grid: [0xc4cfb6, 0xe0e6d6], gridOp: 0.55, dust: 0x8aa65b, dustOp: 0.3,
    struct: 0xcbd3c0, structRough: 0.75, structMetal: 0.15, concrete: 0xdde3d4, glassOp: 0.22,
    face: 0x4e8218, faceFill: 0.88, faceEdge: 0.7, sweep: 0xffffff, sweepOp: 0.3, sweepBlend: 1,
    ground: 0xe6ebde, groundOp: 0.75,
  },
};

const KEYFRAMES: Record<SceneVariant, { fog: number; kf: { p: [number, number, number]; t: [number, number, number] }[] }> = {
  audio: { fog: 0.05, kf: [{ p: [0.4, 1.4, 6.6], t: [0, 0.35, 0] }, { p: [1.5, 0.95, 2.6], t: [0, 0.45, 0.5] }, { p: [-2.8, 1.2, 4.8], t: [0, 0.2, 0] }, { p: [0, 13.5, 15.5], t: [0, -0.4, 0] }, { p: [0, 1.8, 6.4], t: [0, 0.3, 0] }] },
  displays: { fog: 0.05, kf: [{ p: [0, 0.7, 6.6], t: [0, 0.75, 0] }, { p: [0, 0.7, 2.4], t: [0, 0.75, 0] }, { p: [-6.8, 1.7, 7.6], t: [0, 0.75, 0] }, { p: [0, 10, 13.5], t: [0, 0.4, 0] }, { p: [0, 0.9, 7.2], t: [0, 0.75, 0] }] },
  wall: { fog: 0.016, kf: [{ p: [13, 4.5, 17], t: [0, 5, -1] }, { p: [5.2, 4.6, 7.6], t: [0.5, 5.2, -2] }, { p: [-13, 2.6, 13], t: [-16, 2.2, -2] }, { p: [0, 30, 34], t: [-4, 0, -10] }, { p: [12, 5.5, 18], t: [0, 4.6, -1] }] },
  street: { fog: 0.03, kf: [{ p: [3.4, 1.6, 7.4], t: [0, 1.3, 0] }, { p: [1.0, 1.5, 3.0], t: [-0.4, 1.4, 0] }, { p: [-4.6, 2.2, 6.0], t: [0, 1.2, 0] }, { p: [0, 17, 20], t: [0, 0, -2] }, { p: [2.6, 1.8, 8.0], t: [0, 1.3, 0] }] },
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

// Builds a scene + updater + disposer for the given variant/theme.
function buildScene(variant: SceneVariant, mode: Mode, reduce: boolean): { scene: THREE.Scene; update: Updater; dispose: () => void } {
  const TH = THEMES[mode];
  const planeG = new THREE.PlaneGeometry(1, 1);
  const boxG = new THREE.BoxGeometry(1, 1, 1);

  const structMat = () => new THREE.MeshStandardMaterial({ color: TH.struct, roughness: TH.structRough, metalness: TH.structMetal });
  const concreteMat = () => new THREE.MeshStandardMaterial({ color: TH.concrete, roughness: 0.95, metalness: 0.02 });

  function makePanel(w: number, h: number) {
    const g = new THREE.Group();
    const glowM = new THREE.MeshBasicMaterial({ color: TH.face, transparent: true, opacity: TH.faceFill, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(planeG, glowM); glow.scale.set(w, h, 1); g.add(glow);
    const lineM = new THREE.MeshBasicMaterial({ color: TH.sweep, transparent: true, opacity: TH.sweepOp, blending: TH.sweepBlend === 2 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide });
    const line = new THREE.Mesh(planeG, lineM); line.scale.set(w, h * 0.07, 1); line.position.z = 0.008; g.add(line);
    const edgeM = new THREE.LineBasicMaterial({ color: TH.face, transparent: true, opacity: TH.faceEdge });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), edgeM);
    edges.position.z = 0.012; g.add(edges);
    g.userData = { glowM, lineM, edgeM, line, h, ph: Math.random() * 6.28, base: TH.faceFill };
    return g;
  }
  function drivePanel(g: THREE.Group, t: number, vis: number, speed?: number) {
    const u = g.userData;
    u.glowM.opacity = vis * (u.base * 0.75 + Math.max(0, Math.sin(t * 0.9 + u.ph)) * u.base * 0.6);
    u.edgeM.opacity = vis * TH.faceEdge;
    u.lineM.opacity = vis * TH.sweepOp;
    u.line.position.y = (((t * (speed || 0.5) + u.ph) % 1) - 0.5) * u.h * 0.94;
  }

  function baseScene(fog: number) {
    const s = new THREE.Scene();
    s.fog = new THREE.FogExp2(TH.bg, fog);
    s.add(new THREE.AmbientLight(TH.amb, TH.ambI));
    const k = new THREE.DirectionalLight(0xffffff, TH.dirI); k.position.set(5, 11, 7); s.add(k);
    const f = new THREE.DirectionalLight(0xffffff, TH.dirI * 0.4); f.position.set(-6, 4, -5); s.add(f);
    const r = new THREE.PointLight(TH.face, TH.rimI, 22); r.position.set(-3, 2, 3); s.add(r);
    const N = 1000, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = (Math.random() - 0.5) * 34; pos[i * 3 + 2] = (Math.random() - 0.5) * 70; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: TH.dust, size: 0.045, transparent: true, opacity: TH.dustOp, depthWrite: false }));
    s.add(dust);
    const grid = new THREE.GridHelper(220, 110, TH.grid[0], TH.grid[1]);
    grid.position.y = -0.02; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = TH.gridOp; s.add(grid);
    s.userData = { dust, grid };
    return s;
  }

  function buildAudio(s: THREE.Scene): Updater {
    const dev = new THREE.Group(); s.add(dev);
    const shell = structMat();
    const body = new THREE.Mesh(boxG, shell); body.scale.set(2.2, 0.6, 2.2); body.position.y = 0.3; dev.add(body);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.21, 0.61, 2.21)), new THREE.LineBasicMaterial({ color: TH.face, transparent: true, opacity: TH.faceEdge * 0.8 }));
    edge.position.y = 0.3; dev.add(edge);
    const slotG = new THREE.BoxGeometry(1.3, 0.02, 0.04), slotM = new THREE.MeshBasicMaterial({ color: mode === "light" ? 0x9aa78c : 0x0a0d08 });
    for (let i = -3; i <= 3; i++) { const m = new THREE.Mesh(slotG, slotM); m.position.set(0.2, 0.605, i * 0.16); dev.add(m); }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 14), new THREE.MeshBasicMaterial({ color: TH.face })); led.position.set(-0.82, 0.16, 1.11); dev.add(led);

    const cam = new THREE.Group(); cam.position.set(-0.05, 0.72, 0.62); dev.add(cam);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 28), shell); barrel.rotation.x = Math.PI / 2; cam.add(barrel);
    const foot = new THREE.Mesh(boxG, shell); foot.scale.set(0.34, 0.14, 0.5); foot.position.set(0, -0.19, -0.1); cam.add(foot);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.09, 28), new THREE.MeshStandardMaterial({ color: mode === "light" ? 0x2a3226 : 0x040603, roughness: 0.12, metalness: 0.95 }));
    lens.rotation.x = Math.PI / 2; lens.position.z = 0.2; cam.add(lens);
    const iris = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.014, 10, 36), new THREE.MeshBasicMaterial({ color: TH.face })); iris.position.z = 0.2; cam.add(iris);

    const coneM = new THREE.MeshBasicMaterial({ color: TH.face, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: mode === "light" ? THREE.NormalBlending : THREE.AdditiveBlending });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.2, 32, 1, true), coneM); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0, 1.8); cam.add(cone);

    const ringG = new THREE.TorusGeometry(1, 0.013, 10, 90), rings: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.MeshBasicMaterial({ color: TH.face, transparent: true, opacity: 0 });
      const r = new THREE.Mesh(ringG, m); r.rotation.x = -Math.PI / 2; r.position.y = 0.08; r.userData = { off: i / 5, mat: m };
      dev.add(r); rings.push(r);
    }
    const wave = new THREE.Group(); wave.position.y = 0.08; dev.add(wave);
    const barG = new THREE.BoxGeometry(0.045, 1, 0.045), bars: THREE.Mesh[] = [];
    for (let i = 0; i < 44; i++) {
      const m = new THREE.MeshBasicMaterial({ color: TH.face, transparent: true, opacity: 0 });
      const b = new THREE.Mesh(barG, m), a = (i / 44) * 6.283;
      b.position.set(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6); b.userData = { mat: m }; wave.add(b); bars.push(b);
    }
    const net = new THREE.Group(); s.add(net);
    const nM = new THREE.MeshStandardMaterial({ color: TH.struct, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0 });
    const dM = new THREE.MeshBasicMaterial({ color: TH.face, transparent: true, opacity: 0 });
    const nG = new THREE.BoxGeometry(0.5, 0.16, 0.5), dG = new THREE.SphereGeometry(0.05, 10, 10), nodes: THREE.Group[] = [];
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      if (!x && !z) continue;
      const g = new THREE.Group();
      g.position.set(x * 3.1 + (Math.random() - 0.5) * 0.7, 0.08, z * 3.1 + (Math.random() - 0.5) * 0.7);
      g.add(new THREE.Mesh(nG, nM));
      const d = new THREE.Mesh(dG, dM); d.position.y = 0.16; g.add(d);
      g.userData = { ph: Math.random() * 6.28 }; net.add(g); nodes.push(g);
    }
    return (t, p) => {
      dev.rotation.y = reduce ? 0.45 : 0.45 + t * 0.1;
      dev.position.y = reduce ? 0 : Math.sin(t * 0.8) * 0.05;
      const scan = seg(p, 0.1, 0.32) * (1 - seg(p, 0.42, 0.55));
      coneM.opacity = scan * (mode === "light" ? 0.09 : 0.12);
      iris.scale.setScalar(1 + scan * Math.sin(t * 3.4) * 0.16);
      const aud = seg(p, 0.33, 0.5) * (1 - seg(p, 0.6, 0.72));
      rings.forEach((r) => { const ph = (t * 0.42 + r.userData.off) % 1, sc = 0.6 + ph * 5.4; r.scale.set(sc, sc, 1); r.userData.mat.opacity = aud * (1 - ph) * 0.7; });
      wave.rotation.y = -t * 0.26;
      bars.forEach((b, i) => { const h = 0.18 + Math.abs(Math.sin(t * 2.6 + i * 0.42)) * 0.95; b.scale.y = h; b.position.y = h / 2; b.userData.mat.opacity = aud * 0.8; });
      const nw = seg(p, 0.6, 0.78) * (1 - seg(p, 0.88, 1));
      nM.opacity = nw * 0.95; dM.opacity = nw;
      nodes.forEach((g) => g.children[1].scale.setScalar(1 + Math.sin(t * 3 + g.userData.ph) * 0.5 * nw));
      net.rotation.y = t * 0.02;
    };
  }

  function buildDisplays(s: THREE.Scene): Updater {
    const bezel = structMat();
    function screen(w: number, h: number) {
      const g = new THREE.Group();
      const f = new THREE.Mesh(boxG, bezel); f.scale.set(w, h, 0.08); g.add(f);
      const pn = makePanel(w * 0.92, h * 0.9); pn.position.z = 0.045; g.add(pn);
      g.userData = { panel: pn }; return g;
    }
    const hero = screen(3.4, 2.0); hero.position.set(0, 0.75, 0); s.add(hero);
    const wall = new THREE.Group(); wall.position.y = 0.75; s.add(wall);
    const ws: THREE.Group[] = [], COLS = 9, R = 7.5;
    for (let c = 0; c < COLS; c++) for (let r = -1; r <= 1; r++) {
      if (c === 4 && r === 0) continue;
      const sc = screen(1.5, 0.92), a = (c - 4) * 0.26;
      sc.position.set(Math.sin(a) * R, r * 1.12, -R + Math.cos(a) * R); sc.rotation.y = -a; wall.add(sc); ws.push(sc);
    }
    const net = new THREE.Group(); s.add(net);
    const mountM = new THREE.MeshStandardMaterial({ color: TH.struct, roughness: 0.6, metalness: 0.45, transparent: true, opacity: 0 });
    const mPanels: THREE.Group[] = [];
    const postG = new THREE.CylinderGeometry(0.05, 0.06, 0.85, 10), footG = new THREE.CylinderGeometry(0.26, 0.3, 0.07, 16);
    for (let i = 0; i < 40; i++) {
      const g = new THREE.Group();
      const ang = (i / 40) * 6.283 + Math.random() * 0.2, rad = 3.5 + Math.random() * 12;
      g.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad); g.rotation.y = -ang + Math.PI / 2;
      const foot = new THREE.Mesh(footG, mountM); foot.position.y = 0.035; g.add(foot);
      const post = new THREE.Mesh(postG, mountM); post.position.y = 0.45; g.add(post);
      const bodyM = new THREE.Mesh(boxG, mountM); bodyM.scale.set(0.95, 0.58, 0.06); bodyM.position.y = 1.15; g.add(bodyM);
      const pn = makePanel(0.86, 0.5); pn.position.set(0, 1.15, 0.04); g.add(pn);
      net.add(g); mPanels.push(pn);
    }
    return (t, p) => {
      const intro = 1 - seg(p, 0.42, 0.58);
      hero.rotation.y = reduce ? 0 : Math.sin(t * 0.35) * 0.13;
      hero.position.y = 0.75 + (reduce ? 0 : Math.sin(t * 0.7) * 0.04);
      drivePanel(hero.userData.panel, t, intro, 0.5);
      const w = seg(p, 0.36, 0.6) * (1 - seg(p, 0.68, 0.84));
      ws.forEach((sc, i) => drivePanel(sc.userData.panel, t - i * 0.12, w, 0.7));
      wall.rotation.y = reduce ? 0 : Math.sin(t * 0.2) * 0.03;
      const n = seg(p, 0.66, 0.84) * (1 - seg(p, 0.92, 1));
      mountM.opacity = n * 0.95;
      mPanels.forEach((pn, i) => drivePanel(pn, t - i * 0.16, n, 0.55));
      net.rotation.y = t * 0.012;
    };
  }

  function buildWall(s: THREE.Scene): Updater {
    const bMat = concreteMat(), fMat = structMat();
    function building(w: number, h: number, d: number, x: number, z: number, ry?: number) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0;
      const b = new THREE.Mesh(boxG, bMat); b.scale.set(w, h, d); b.position.y = h / 2; g.add(b);
      const cap = new THREE.Mesh(boxG, fMat); cap.scale.set(w * 1.02, 0.22, d * 1.02); cap.position.y = h + 0.11; g.add(cap);
      const winM = new THREE.MeshBasicMaterial({ color: mode === "light" ? 0xb3bea6 : 0x0b1109 });
      for (let fy = 1; fy < h - 1.4; fy += 2.1) for (let fx = -d / 2 + 1; fx < d / 2 - 0.6; fx += 1.7) {
        const wdw = new THREE.Mesh(boxG, winM); wdw.scale.set(0.06, 1.1, 0.85); wdw.position.set(w / 2 + 0.02, fy, fx); g.add(wdw);
      }
      return g;
    }
    const hero = building(11, 15, 20, 0, -4, 0); s.add(hero);
    const heroWall = makePanel(15, 10); heroWall.rotation.y = Math.PI / 2; heroWall.position.set(-5.55, 7.4, -4); s.add(heroWall);
    const b2 = building(8, 9, 12, 17, 0, 0); s.add(b2);
    const wall2 = makePanel(8.5, 5.5); wall2.rotation.y = -Math.PI / 2; wall2.position.set(13.04, 5, 0); s.add(wall2);

    const fence = new THREE.Group(); fence.position.set(-17, 0, 4); fence.rotation.y = 0.06; s.add(fence);
    const fencePanels: THREE.Group[] = [];
    for (let i = 0; i < 9; i++) {
      const seg2 = new THREE.Group(); seg2.position.z = -i * 4.2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), fMat); post.position.set(0, 1.3, 2.1); seg2.add(post);
      const rail = new THREE.Mesh(boxG, fMat); rail.scale.set(0.06, 0.07, 4.2); rail.position.set(0, 2.5, 0); seg2.add(rail);
      const banner = makePanel(4.05, 2.1); banner.rotation.y = Math.PI / 2; banner.position.set(0.05, 1.35, 0); seg2.add(banner); fencePanels.push(banner);
      fence.add(seg2);
    }
    const endPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), fMat); endPost.position.set(0, 1.3, -9 * 4.2 + 2.1); fence.add(endPost);

    const block = new THREE.Group(); s.add(block);
    const blockPanels: THREE.Group[] = [];
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const bw = 6 + Math.random() * 6, bh = 7 + Math.random() * 9, bd = 9 + Math.random() * 7;
      const g = building(bw, bh, bd, side * (15 + Math.random() * 10), -22 - i * 15, 0); block.add(g);
      const pn = makePanel(bd * 0.72, bh * 0.5); pn.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; pn.position.set(0, bh * 0.55, -22 - i * 15);
      pn.position.x = side * (15 + Math.random() * 10) + (side > 0 ? -bw / 2 - 0.05 : bw / 2 + 0.05);
      block.add(pn); blockPanels.push(pn);
    }
    const road = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ color: TH.ground, transparent: true, opacity: TH.groundOp }));
    road.rotation.x = -Math.PI / 2; road.scale.set(22, 240, 1); road.position.set(0, 0.01, -90); s.add(road);
    return (t, p) => {
      const near = 1 - seg(p, 0.62, 0.8) * 0.7;
      drivePanel(heroWall, t, near, 0.28);
      drivePanel(wall2, t + 1.2, near * 0.85, 0.28);
      const fen = seg(p, 0.36, 0.58) * (1 - seg(p, 0.74, 0.88));
      fencePanels.forEach((b, i) => drivePanel(b, t - i * 0.22, Math.max(0.25 * near, fen), 0.4));
      const blk = seg(p, 0.62, 0.82) * (1 - seg(p, 0.92, 1));
      blockPanels.forEach((b, i) => drivePanel(b, t - i * 0.3, blk, 0.35));
    };
  }

  function buildStreet(s: THREE.Scene): Updater {
    const metal = structMat();
    const glass = new THREE.MeshStandardMaterial({ color: mode === "light" ? 0xc9d6c2 : 0x0c120a, roughness: 0.1, metalness: 0.2, transparent: true, opacity: TH.glassOp });
    const shelter = new THREE.Group(); shelter.position.set(-1.4, 0, 0); s.add(shelter);
    const roof = new THREE.Mesh(boxG, metal); roof.scale.set(4.4, 0.13, 1.8); roof.position.y = 2.6; shelter.add(roof);
    [-2.1, 2.1].forEach((x) => { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 10), metal); col.position.set(x, 1.3, -0.8); shelter.add(col); const c2 = col.clone(); c2.position.z = 0.8; shelter.add(c2); });
    const back = new THREE.Mesh(boxG, glass); back.scale.set(4.3, 2.2, 0.05); back.position.set(0, 1.35, -0.87); shelter.add(back);
    const bench = new THREE.Mesh(boxG, metal); bench.scale.set(3, 0.12, 0.5); bench.position.set(0, 0.5, -0.5); shelter.add(bench);
    [-0.9, 0.9].forEach((x) => { const l = new THREE.Mesh(boxG, metal); l.scale.set(0.1, 0.5, 0.45); l.position.set(x, 0.25, -0.5); shelter.add(l); });
    const endFrame = new THREE.Mesh(boxG, metal); endFrame.scale.set(0.14, 2.4, 1.6); endFrame.position.set(2.28, 1.25, 0); shelter.add(endFrame);
    const adA = makePanel(1.35, 2.1); adA.rotation.y = Math.PI / 2; adA.position.set(2.37, 1.25, 0); shelter.add(adA);
    const adB = makePanel(1.35, 2.1); adB.rotation.y = -Math.PI / 2; adB.position.set(2.19, 1.25, 0); shelter.add(adB);

    const kiosk = new THREE.Group(); kiosk.position.set(3.1, 0, 1.2); s.add(kiosk);
    const kBody = new THREE.Mesh(boxG, metal); kBody.scale.set(1.35, 2.8, 0.42); kBody.position.y = 1.4; kiosk.add(kBody);
    const kBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.18, 20), metal); kBase.position.y = 0.09; kiosk.add(kBase);
    const kA = makePanel(1.1, 2.2); kA.position.set(0, 1.5, 0.22); kiosk.add(kA);
    const kB = makePanel(1.1, 2.2); kB.rotation.y = Math.PI; kB.position.set(0, 1.5, -0.22); kiosk.add(kB);

    const district = new THREE.Group(); s.add(district);
    const dPanels: THREE.Group[] = [];
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group();
      const ang = (i / 26) * 6.283, rad = 9 + Math.random() * 13;
      g.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad); g.rotation.y = -ang + Math.PI / 2;
      const post = new THREE.Mesh(boxG, metal); post.scale.set(1.1, 2.4, 0.35); post.position.y = 1.2; g.add(post);
      const pn = makePanel(0.9, 1.9); pn.position.set(0, 1.3, 0.19); g.add(pn);
      district.add(g); dPanels.push(pn);
    }
    const walk = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ color: TH.ground, transparent: true, opacity: TH.groundOp }));
    walk.rotation.x = -Math.PI / 2; walk.scale.set(70, 70, 1); walk.position.y = 0.005; s.add(walk);
    return (t, p) => {
      const near = 1 - seg(p, 0.62, 0.78);
      drivePanel(adA, t, near, 0.45);
      drivePanel(adB, t + 0.4, near * 0.8, 0.45);
      const kv = seg(p, 0.3, 0.5) * near;
      drivePanel(kA, t, Math.max(near * 0.35, kv), 0.6);
      drivePanel(kB, t + 0.5, Math.max(near * 0.35, kv), 0.6);
      const dv = seg(p, 0.62, 0.82) * (1 - seg(p, 0.9, 1));
      dPanels.forEach((pn, i) => drivePanel(pn, t - i * 0.18, dv, 0.5));
      district.rotation.y = t * 0.012;
    };
  }

  const BUILD: Record<SceneVariant, (s: THREE.Scene) => Updater> = { audio: buildAudio, displays: buildDisplays, wall: buildWall, street: buildStreet };
  const scene = baseScene(KEYFRAMES[variant].fog);
  const update = BUILD[variant](scene);

  const dispose = () => {
    scene.traverse((o) => {
      const m = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
      m.geometry?.dispose();
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => mm.dispose());
    });
    planeG.dispose();
    boxG.dispose();
  };

  return { scene, update, dispose };
}

export function ScrollScene({ variant }: { variant: SceneVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return; // no WebGL — the page stands on its own
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 320);
    const look = new THREE.Vector3();
    const clock = new THREE.Clock();
    const kf = KEYFRAMES[variant].kf;

    let mode: Mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
    let built = buildScene(variant, mode, reduce);
    renderer.setClearColor(THEMES[mode].bg, 0);

    let raw = 0, eased = 0;
    const onScroll = () => { const max = document.body.scrollHeight - window.innerHeight; raw = max > 0 ? window.scrollY / max : 0; };
    const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();

    function place(p: number) {
      const s = p * (kf.length - 1);
      const i = Math.min(Math.floor(s), kf.length - 2), f = smooth(s - i), a = kf[i], b = kf[i + 1];
      camera.position.set(a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f, a.p[2] + (b.p[2] - a.p[2]) * f);
      look.set(a.t[0] + (b.t[0] - a.t[0]) * f, a.t[1] + (b.t[1] - a.t[1]) * f, a.t[2] + (b.t[2] - a.t[2]) * f);
      camera.lookAt(look);
    }

    let rafId = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      eased += (raw - eased) * (reduce ? 1 : 0.075);
      place(eased);
      built.update(t, eased);
      built.scene.userData.dust.rotation.y = t * 0.006;
      renderer.render(built.scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // Follow the header theme toggle (repo toggles `dark` on <html>).
    const obs = new MutationObserver(() => {
      const next: Mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
      if (next === mode) return;
      mode = next;
      const y = window.scrollY;
      built.dispose();
      built = buildScene(variant, mode, reduce);
      renderer.setClearColor(THEMES[mode].bg, 0);
      window.scrollTo(0, y);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      obs.disconnect();
      built.dispose();
      renderer.dispose();
    };
  }, [variant]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" />;
}
