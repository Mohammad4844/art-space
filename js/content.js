// Loads the two content files that Pages CMS edits, and tidies them up
// so the rest of the site never has to worry about missing fields.

const DEFAULT_SIZE_CM = 75;

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The CMS writes "/images/x.jpg". Making it relative keeps it working
// whether the site lives at the domain root or under /repo-name/.
export function imageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return encodeURI(String(path).replace(/^\/+/, ""));
}

async function getJson(path) {
  const res = await fetch(path, {cache: "no-cache"});
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

export async function loadContent() {
  const [site, rawArtworks] = await Promise.all([
    getJson("content/site.json"),
    getJson("content/artworks.json"),
  ]);

  const seen = new Set();
  const artworks = (Array.isArray(rawArtworks) ? rawArtworks : [])
    .filter((a) => a && a.title && a.image)
    .map((a, i) => {
      let slug = slugify(a.title) || `painting-${i + 1}`;
      while (seen.has(slug)) slug = `${slug}-${i + 1}`;
      seen.add(slug);
      const hasSize = Number(a.width_cm) > 0 && Number(a.height_cm) > 0;
      return {
        title: String(a.title).trim(),
        slug,
        image: imageUrl(a.image),
        category: a.category || "",
        description: a.description || "",
        widthCm: hasSize ? Number(a.width_cm) : DEFAULT_SIZE_CM,
        heightCm: hasSize ? Number(a.height_cm) : DEFAULT_SIZE_CM,
        hasSize,
        featured: Boolean(a.featured),
      };
    });

  return {
    site: {
      name: site.name || "Simi Khalid",
      intro: site.intro || "",
      bio: site.bio || "",
      location: site.location || "",
      whatsapp: String(site.whatsapp || "").replace(/\D/g, ""),
      email: site.email || "",
      instagram: site.instagram || "",
      portrait: imageUrl(site.portrait),
    },
    artworks,
  };
}
