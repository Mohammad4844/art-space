import {loadContent} from "./content.js";
import {createCanvas3D, createViewer} from "./viewer.js";

const main = document.getElementById("main");
const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canTransition = () => Boolean(document.startViewTransition) && !REDUCED_MOTION;

let content = null;
let currentRoute = null;
let cleanups = [];
let homeScroll = 0;
let lastSlug = null;
let activeFilter = "All";

// ---------- small helpers ----------

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
}

function paragraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sizeLabel(art) {
  return art.hasSize ? `${art.widthCm} × ${art.heightCm} cm` : "";
}

function fragment(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content;
}

function whatsappLink(text) {
  const {whatsapp} = content.site;
  return whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}` : "";
}

function emailLink(subject, body) {
  const {email} = content.site;
  return email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : "";
}

// "Simi Khalid" -> "Simi <em>Khalid</em>", set on two lines.
function heroName(name) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${esc(first)} <em>${esc(rest.join(" "))}</em>` : esc(first);
}

function firstName() {
  return content.site.name.split(" ")[0];
}

// ---------- reveal on scroll ----------

const revealer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add("in");
    revealer.unobserve(entry.target);
  }
}, {rootMargin: "0px 0px -8% 0px"});

function reveal(root, instant) {
  root.querySelectorAll("[data-reveal]").forEach((el, i) => {
    if (instant || REDUCED_MOTION) {
      el.classList.add("in");
    } else {
      el.style.transitionDelay = `${Math.min(i % 3, 2) * 90}ms`;
      revealer.observe(el);
    }
  });
}

// ---------- routes ----------

function parseRoute() {
  const [section, slug] = location.hash.replace(/^#\/?/, "").split("/");
  if (section === "art" && slug) return {name: "art", slug: decodeURIComponent(slug)};
  if (section === "about") return {name: "about"};
  if (section === "contact") return {name: "contact"};
  return {name: "home"};
}

function cardHtml(art) {
  const ratio = art.hasSize ? ` style="aspect-ratio: ${art.widthCm} / ${art.heightCm}"` : "";
  const meta = [art.category, sizeLabel(art)].filter(Boolean).join(" · ");
  return `
    <li class="card" data-reveal data-slug="${esc(art.slug)}">
      <a class="card-link" href="#/art/${esc(art.slug)}" data-art-link>
        <div class="card-frame"${ratio} data-vt>
          <img src="${esc(art.image)}" alt="${esc(art.title)}" loading="lazy" decoding="async">
        </div>
        <div class="card-caption">
          <span class="card-title">${esc(art.title)}</span>
          ${meta ? `<span class="card-meta">${esc(meta)}</span>` : ""}
        </div>
      </a>
    </li>`;
}

function renderGallery(list) {
  const shown = content.artworks.filter((a) => activeFilter === "All" || a.category === activeFilter);
  list.innerHTML = shown.map(cardHtml).join("");
}

function renderHome(instant) {
  const {site, artworks} = content;
  const featured = artworks.find((a) => a.featured) || artworks[0];
  const categories = [...new Set(artworks.map((a) => a.category).filter(Boolean))];
  if (!categories.includes(activeFilter)) activeFilter = "All";

  const view = fragment(`
    <section class="hero">
      <div class="hero-text" data-reveal>
        <p class="eyebrow">Original paintings${site.location ? ` · ${esc(site.location.split(",")[0])}` : ""}</p>
        <h1 class="hero-title">${heroName(site.name)}</h1>
        ${site.intro ? `<p class="hero-intro">${esc(site.intro)}</p>` : ""}
        <button class="text-link" type="button" data-scroll-work>View the work</button>
      </div>
      ${featured ? `
      <a class="hero-art" href="#/art/${esc(featured.slug)}" data-art-link aria-label="${esc(featured.title)}">
        <div class="hero-scene" data-vt></div>
        <p class="hero-caption"><em>${esc(featured.title)}</em>${featured.category ? ` · ${esc(featured.category)}` : ""}</p>
      </a>` : ""}
    </section>

    <section class="work" aria-labelledby="work-title">
      <div class="work-head">
        <h2 class="section-title" id="work-title">The work</h2>
        ${categories.length > 1 ? `
        <div class="filters" role="group" aria-label="Filter by subject">
          ${["All", ...categories].map((c) => `<button type="button" class="filter" data-filter="${esc(c)}" aria-pressed="${c === activeFilter}">${esc(c)}</button>`).join("")}
        </div>` : ""}
      </div>
      ${artworks.length ? `<ul class="gallery"></ul>` : `<p class="empty">New paintings are on their way.</p>`}
    </section>

    <section class="invite" data-reveal>
      <p class="invite-title">Interested in a piece?</p>
      <p class="invite-text">Every painting is an original. Send a message and ${esc(firstName())} will get back to you.</p>
      <p class="invite-actions">${contactButtons(`Hello ${firstName()}, I came across your paintings and would love to know more.`, "Enquiry about your paintings")}</p>
    </section>
  `);

  const list = view.querySelector(".gallery");
  if (list) renderGallery(list);

  if (featured) {
    const hero = createCanvas3D(featured, {rest: {x: 4, y: -24}, fill: 0.78});
    view.querySelector(".hero-scene").append(hero.el);
    cleanups.push(hero.destroy);
  }

  view.querySelector("[data-scroll-work]").addEventListener("click", () => {
    document.querySelector(".work").scrollIntoView({behavior: REDUCED_MOTION ? "auto" : "smooth"});
  });

  view.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.filter === activeFilter) return;
      const gallery = document.querySelector(".gallery");
      const update = () => {
        activeFilter = btn.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === activeFilter)));
        renderGallery(gallery);
        nameCards(gallery);
        gallery.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in"));
      };
      if (!canTransition()) return update();
      nameCards(gallery);
      document.startViewTransition(update).finished.finally(() => nameCards(gallery, true));
    });
  });

  main.replaceChildren(view);
  reveal(main, instant);
  document.title = `${site.name} — Paintings`;
}

// Gives each card its own view-transition name so filtering animates the reflow.
function nameCards(gallery, clear = false) {
  gallery.querySelectorAll(".card").forEach((card) => {
    card.style.viewTransitionName = clear ? "" : `card-${card.dataset.slug}`;
  });
}

function contactButtons(message, subject) {
  const wa = whatsappLink(message);
  const mail = emailLink(subject, message);
  return [
    wa && `<a class="btn btn-primary" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`,
    mail && `<a class="btn btn-ghost" href="${esc(mail)}">Email</a>`,
  ].filter(Boolean).join("");
}

function renderArt(slug) {
  const {artworks, site} = content;
  const index = artworks.findIndex((a) => a.slug === slug);
  if (index === -1) {
    main.replaceChildren(fragment(`
      <section class="missing">
        <h1 class="section-title">This painting could not be found</h1>
        <p><a class="text-link" href="#/">See all the work</a></p>
      </section>`));
    document.title = `Not found — ${site.name}`;
    return;
  }

  const art = artworks[index];
  const prev = artworks[(index - 1 + artworks.length) % artworks.length];
  const next = artworks[(index + 1) % artworks.length];
  lastSlug = art.slug;
  const message = `Hello ${firstName()}, I'm interested in your painting "${art.title}". ${location.href}`;

  const view = fragment(`
    <article class="art">
      <a class="back-link" href="#/">All work</a>
      <div class="art-layout">
        <div class="art-view"></div>
        <div class="art-info">
          ${art.category ? `<p class="eyebrow">${esc(art.category)}</p>` : ""}
          <h1 class="art-title">${esc(art.title)}</h1>
          ${art.hasSize ? `<p class="art-size">${esc(sizeLabel(art))}</p>` : ""}
          <div class="art-desc">${paragraphs(art.description)}</div>
          <div class="enquire">
            <p class="enquire-note">Interested in this painting?</p>
            <p class="enquire-actions">${contactButtons(message, `Enquiry: ${art.title}`)}</p>
          </div>
        </div>
      </div>
      ${artworks.length > 1 ? `
      <nav class="pager" aria-label="More paintings">
        <a class="pager-link pager-prev" href="#/art/${esc(prev.slug)}">
          <img src="${esc(prev.image)}" alt="" loading="lazy">
          <span><small>Previous</small>${esc(prev.title)}</span>
        </a>
        <a class="pager-link pager-next" href="#/art/${esc(next.slug)}">
          <span><small>Next</small>${esc(next.title)}</span>
          <img src="${esc(next.image)}" alt="" loading="lazy">
        </a>
      </nav>` : ""}
    </article>
  `);

  const viewer = createViewer(art);
  viewer.el.querySelector(".viewer-stage").style.viewTransitionName = "artwork";
  view.querySelector(".art-view").append(viewer.el);
  cleanups.push(viewer.destroy);

  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea")) return;
    if (e.key === "ArrowLeft") location.hash = `#/art/${prev.slug}`;
    if (e.key === "ArrowRight") location.hash = `#/art/${next.slug}`;
    if (e.key === "Escape") location.hash = "#/";
  };
  document.addEventListener("keydown", onKey);
  cleanups.push(() => document.removeEventListener("keydown", onKey));

  main.replaceChildren(view);
  document.title = `${art.title} — ${site.name}`;
}

function renderAbout() {
  const {site, artworks} = content;
  const initials = site.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2);
  const view = fragment(`
    <section class="about">
      <div class="about-portrait" data-reveal>
        ${site.portrait
          ? `<img src="${esc(site.portrait)}" alt="${esc(site.name)}">`
          : `<div class="monogram" aria-hidden="true"><span>${esc(initials)}</span></div>`}
      </div>
      <div class="about-text" data-reveal>
        <p class="eyebrow">About</p>
        <h1 class="about-title">${esc(site.name)}</h1>
        <div class="about-bio">${paragraphs(site.bio)}</div>

        <div class="contact-block" id="contact">
          <h2 class="section-title">Get in touch</h2>
          ${site.location ? `<p class="contact-location">Based in ${esc(site.location)}</p>` : ""}
          <p class="contact-actions">${contactButtons(`Hello ${firstName()}, I came across your paintings and would love to know more.`, "Hello from your website")}</p>
          ${site.instagram ? `<p><a class="text-link" href="${esc(site.instagram)}" target="_blank" rel="noopener">Instagram</a></p>` : ""}
        </div>
      </div>
    </section>
    ${artworks.length ? `
    <section class="about-strip" aria-label="A few paintings">
      ${artworks.slice(0, 4).map((a) => `
        <a href="#/art/${esc(a.slug)}" class="strip-item" data-reveal><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"></a>`).join("")}
    </section>` : ""}
  `);
  main.replaceChildren(view);
  reveal(main);
  document.title = `About — ${site.name}`;
}

function renderFooter() {
  const {site} = content;
  document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = site.name));
  document.querySelector("[data-site-location]").textContent = site.location;
  const links = [
    site.whatsapp && `<a href="${esc(whatsappLink(`Hello ${firstName()},`))}" target="_blank" rel="noopener">WhatsApp</a>`,
    site.email && `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`,
    site.instagram && `<a href="${esc(site.instagram)}" target="_blank" rel="noopener">Instagram</a>`,
  ].filter(Boolean);
  document.querySelector("[data-contact-links]").innerHTML = links.join('<span aria-hidden="true"> · </span>');
}

function render(route, prev) {
  cleanups.forEach((fn) => fn());
  cleanups = [];

  if (route.name === "art") renderArt(route.slug);
  else if (route.name === "about" || route.name === "contact") renderAbout();
  else renderHome(Boolean(prev));

  document.querySelectorAll("[data-nav]").forEach((a) => {
    const on = a.dataset.nav === route.name || (route.name === "art" && a.dataset.nav === "home");
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  if (route.name === "home" && prev?.name === "art") {
    window.scrollTo(0, homeScroll);
    const card = main.querySelector(`.card[data-slug="${CSS.escape(lastSlug || "")}"] [data-vt]`);
    if (card) {
      const r = card.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) card.scrollIntoView({block: "center"});
      card.style.viewTransitionName = "artwork";
    }
  } else if (route.name === "contact") {
    document.getElementById("contact")?.scrollIntoView({block: "start"});
  } else if (prev) {
    window.scrollTo(0, 0);
  }
}

function navigate() {
  const route = parseRoute();
  const prev = currentRoute;
  if (prev?.name === "home") homeScroll = window.scrollY;
  currentRoute = route;

  if (!prev || !canTransition()) return render(route, prev);
  const transition = document.startViewTransition(() => render(route, prev));
  transition.finished.finally(() => {
    main.querySelectorAll("[data-vt]").forEach((el) => (el.style.viewTransitionName = ""));
  });
}

// The painting the visitor clicked is the one that morphs into the next page.
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-art-link]");
  if (!link || !canTransition()) return;
  const vt = link.querySelector("[data-vt]");
  if (vt) vt.style.viewTransitionName = "artwork";
});

document.querySelector(".skip").addEventListener("click", (e) => {
  e.preventDefault();
  main.focus();
});

async function start() {
  try {
    content = await loadContent();
  } catch (err) {
    console.error(err);
    main.innerHTML = `<p class="loading">The gallery could not be loaded. Please refresh the page.</p>`;
    return;
  }
  renderFooter();
  navigate();
  window.addEventListener("hashchange", navigate);
}

start();
