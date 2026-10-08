// The three ways to look at a painting: as a physical canvas you can tilt,
// hanging to scale on a wall, and up close through a magnifying lens.
// All three are built from the single photo of the painting.

const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CANVAS_DEPTH_CM = 4.5;   // a deep-edge stretched canvas
const ROOM_WIDTH_CM = 340;     // how much wall the "on a wall" view shows
const SOFA = {width: 210, height: 82};

function h(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Absolute, because a relative url() inside a CSS variable resolves
// against the stylesheet's folder rather than the page.
function cssUrl(src) {
  return `url("${new URL(src, document.baseURI).href.replace(/"/g, "%22")}")`;
}

// ---------- 1. The tiltable canvas ----------

export function createCanvas3D(art, {rest = {x: 5, y: -20}, fill = 0.68, sway = true} = {}) {
  const scene = h("div", "c3d-scene");
  const box = h("div", "c3d-box");
  box.style.setProperty("--img", cssUrl(art.image));
  box.append(h("div", "c3d-shadow"));
  for (const side of ["left", "right", "top", "bottom"]) box.append(h("div", `c3d-face c3d-${side}`));
  const front = h("div", "c3d-face c3d-front");
  const img = h("img", "", {src: art.image, alt: art.title, draggable: "false"});
  front.append(img, h("span", "c3d-sheen"));
  box.append(front);
  scene.append(box);

  let ratio = art.widthCm / art.heightCm;
  const cur = {...rest};
  const target = {...rest};
  let hovering = false;
  let dragging = null;
  let visible = true;
  let raf = 0;
  const start = performance.now();

  function layout() {
    const sw = scene.clientWidth;
    const sh = scene.clientHeight;
    if (!sw || !sh) return;
    let w = sw * fill;
    let hgt = w / ratio;
    if (hgt > sh * fill) {
      hgt = sh * fill;
      w = hgt * ratio;
    }
    const d = Math.max(5, (w * CANVAS_DEPTH_CM) / art.widthCm);
    box.style.setProperty("--w", `${w}px`);
    box.style.setProperty("--h", `${hgt}px`);
    box.style.setProperty("--d", `${d}px`);
  }

  img.addEventListener("load", () => {
    if (img.naturalWidth && img.naturalHeight) ratio = img.naturalWidth / img.naturalHeight;
    layout();
  });

  function apply() {
    box.style.transform = `rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
    // The highlight drifts opposite to the tilt, as if lit from above-left.
    box.style.setProperty("--lx", `${50 - cur.y * 1.6}%`);
    box.style.setProperty("--ly", `${30 + cur.x * 2}%`);
  }

  function tick(now) {
    raf = 0;
    if (!hovering && !dragging && sway && !REDUCED_MOTION) {
      const t = (now - start) / 1000;
      target.x = rest.x + Math.sin(t * 0.5) * 1.5;
      target.y = rest.y + Math.sin(t * 0.35) * 3;
    }
    const ease = dragging ? 0.35 : 0.075;
    cur.x += (target.x - cur.x) * ease;
    cur.y += (target.y - cur.y) * ease;
    apply();
    const settled = Math.abs(target.x - cur.x) < 0.01 && Math.abs(target.y - cur.y) < 0.01;
    const keepSwaying = sway && !REDUCED_MOTION && !hovering && !dragging;
    if (visible && (!settled || keepSwaying)) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!raf && visible) raf = requestAnimationFrame(tick);
  }

  scene.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      const r = scene.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      hovering = true;
      target.y = nx * 46;
      target.x = -ny * 26;
      wake();
    } else if (dragging) {
      target.y = Math.max(-38, Math.min(38, dragging.y + (e.clientX - dragging.px) * 0.35));
      target.x = Math.max(-18, Math.min(18, dragging.x - (e.clientY - dragging.py) * 0.2));
      wake();
    }
  });
  scene.addEventListener("pointerleave", () => {
    hovering = false;
    target.x = rest.x;
    target.y = rest.y;
    wake();
  });
  scene.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    dragging = {px: e.clientX, py: e.clientY, x: cur.x, y: cur.y};
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = null;
    target.x = rest.x;
    target.y = rest.y;
    wake();
  };
  scene.addEventListener("pointerup", endDrag);
  scene.addEventListener("pointercancel", endDrag);

  const ro = new ResizeObserver(layout);
  ro.observe(scene);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  io.observe(scene);

  apply();
  wake();

  return {
    el: scene,
    destroy() {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    },
  };
}

// ---------- 2. On a wall, to scale ----------

const SOFA_SVG = `
<svg viewBox="0 0 210 82" aria-hidden="true" preserveAspectRatio="none">
  <rect x="16" y="74" width="4" height="8" fill="#5b4636"/>
  <rect x="190" y="74" width="4" height="8" fill="#5b4636"/>
  <rect x="8" y="8" width="194" height="44" rx="9" fill="#c4b399"/>
  <rect x="15" y="13" width="58" height="36" rx="8" fill="#d2c3a9"/>
  <rect x="76" y="13" width="58" height="36" rx="8" fill="#d0c0a6"/>
  <rect x="137" y="13" width="58" height="36" rx="8" fill="#d2c3a9"/>
  <rect x="0" y="44" width="210" height="32" rx="7" fill="#b6a489"/>
  <rect x="17" y="43" width="58" height="15" rx="5" fill="#cbbb9f"/>
  <rect x="76" y="43" width="58" height="15" rx="5" fill="#c9b99d"/>
  <rect x="135" y="43" width="58" height="15" rx="5" fill="#cbbb9f"/>
  <rect x="0" y="28" width="19" height="48" rx="8" fill="#bcab8f"/>
  <rect x="191" y="28" width="19" height="48" rx="8" fill="#bcab8f"/>
  <rect x="24" y="24" width="26" height="24" rx="6" fill="#a9653f" transform="rotate(-8 37 36)"/>
  <rect x="160" y="26" width="24" height="22" rx="6" fill="#7d8b78" transform="rotate(7 172 37)"/>
</svg>`;

export function createWallView(art) {
  const room = h("div", "room");
  const wall = h("div", "room-wall");
  const floor = h("div", "room-floor");
  const painting = h("div", "room-painting");
  painting.append(h("img", "", {src: art.image, alt: `${art.title}, shown on a wall`, draggable: "false"}));
  const sofa = h("div", "room-sofa");
  sofa.innerHTML = SOFA_SVG;
  room.append(wall, floor, sofa, painting);

  function layout() {
    const W = room.clientWidth;
    const H = room.clientHeight;
    if (!W || !H) return;
    const px = W / ROOM_WIDTH_CM;
    const roomHeightCm = H / px;
    const floorCm = 26;
    const sofaBottomCm = 12;
    const sofaTopCm = sofaBottomCm + SOFA.height;
    let bottomCm = sofaTopCm + 22;
    if (bottomCm + art.heightCm > roomHeightCm - 10) {
      bottomCm = Math.max(sofaTopCm + 6, roomHeightCm - 10 - art.heightCm);
    }
    floor.style.height = `${floorCm * px}px`;
    Object.assign(sofa.style, {
      width: `${SOFA.width * px}px`,
      height: `${SOFA.height * px}px`,
      left: `${(W - SOFA.width * px) / 2}px`,
      bottom: `${sofaBottomCm * px}px`,
    });
    Object.assign(painting.style, {
      width: `${art.widthCm * px}px`,
      height: `${art.heightCm * px}px`,
      left: `${(W - art.widthCm * px) / 2}px`,
      bottom: `${bottomCm * px}px`,
    });
  }

  const ro = new ResizeObserver(layout);
  ro.observe(room);
  return {el: room, destroy: () => ro.disconnect()};
}

// ---------- 3. Up close, with a lens ----------

export function createCloseView(art) {
  const wrap = h("div", "close");
  const img = h("img", "close-img", {src: art.image, alt: `${art.title}, detail view`, draggable: "false"});
  const lens = h("div", "close-lens", {"aria-hidden": "true"});
  lens.style.backgroundImage = cssUrl(art.image);
  wrap.append(img, lens);

  function show(e) {
    const LENS = lens.offsetWidth;
    const r = img.getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) {
      lens.classList.remove("on");
      return;
    }
    const zoom = Math.max(1.8, Math.min(3, (img.naturalWidth / r.width) * 1.15));
    const wr = wrap.getBoundingClientRect();
    const lx = e.clientX - wr.left;
    const ly = e.clientY - wr.top - (touch ? LENS * 0.65 : 0);
    lens.style.transform = `translate(${lx - LENS / 2}px, ${ly - LENS / 2}px)`;
    lens.style.backgroundSize = `${r.width * zoom}px ${r.height * zoom}px`;
    lens.style.backgroundPosition = `${-(x * zoom - LENS / 2)}px ${-(y * zoom - LENS / 2)}px`;
    lens.classList.add("on");
  }

  wrap.addEventListener("pointermove", show);
  wrap.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") wrap.setPointerCapture(e.pointerId);
    show(e);
  });
  const hide = () => lens.classList.remove("on");
  wrap.addEventListener("pointerleave", hide);
  wrap.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") hide();
  });
  wrap.addEventListener("pointercancel", hide);

  return {el: wrap, destroy() {}};
}

// ---------- The viewer that switches between them ----------

const MODES = [
  {
    key: "canvas",
    label: "Canvas",
    hint: {mouse: "Move across the painting to tilt it", touch: "Drag to turn the canvas"},
    make: (art) => createCanvas3D(art),
  },
  {
    key: "wall",
    label: "On a wall",
    hint: null,
    make: createWallView,
  },
  {
    key: "close",
    label: "Up close",
    hint: {mouse: "Hover to look closer", touch: "Touch and drag to look closer"},
    make: createCloseView,
  },
];

export function createViewer(art) {
  const root = h("div", "viewer");
  const tabs = h("div", "viewer-tabs", {role: "group", "aria-label": "How to view the painting"});
  const stage = h("div", "viewer-stage");
  const caption = h("p", "viewer-caption");
  root.append(stage, tabs, caption);

  const touch = matchMedia("(hover: none)").matches;
  const built = new Map();
  let active = null;

  function captionFor(mode) {
    if (mode.key === "wall") {
      const size = `${art.widthCm} × ${art.heightCm} cm`;
      return art.hasSize
        ? `Shown to scale: ${size}, above a 2.1 m sofa`
        : "Approximate scale — size not listed";
    }
    return touch ? mode.hint.touch : mode.hint.mouse;
  }

  function select(key) {
    const mode = MODES.find((m) => m.key === key);
    if (!built.has(key)) {
      const view = mode.make(art);
      const layer = h("div", `viewer-layer viewer-layer-${key}`);
      layer.append(view.el);
      stage.append(layer);
      built.set(key, {view, layer});
    }
    for (const [k, {layer}] of built) layer.classList.toggle("active", k === key);
    for (const btn of tabs.children) btn.setAttribute("aria-pressed", String(btn.dataset.mode === key));
    caption.textContent = captionFor(mode);
    stage.dataset.mode = key;
    active = key;
  }

  for (const mode of MODES) {
    const btn = h("button", "viewer-tab", {type: "button", "data-mode": mode.key});
    btn.textContent = mode.label;
    btn.addEventListener("click", () => active !== mode.key && select(mode.key));
    tabs.append(btn);
  }

  select("canvas");

  return {
    el: root,
    destroy() {
      for (const {view} of built.values()) view.destroy();
    },
  };
}
