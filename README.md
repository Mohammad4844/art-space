# Simi Khalid — Paintings

A small, free portfolio site: plain HTML/CSS/JS on GitHub Pages, edited through
[Pages CMS](https://pagescms.org). No server, no build step, no monthly cost.

## What's here

```
index.html              the whole site (home, painting pages, about) — hash routes
qr.html                 printable QR codes: one for the site, one label per painting
css/style.css
js/app.js               routing and page rendering
js/viewer.js            "Canvas" (3D tilt), "On a wall" (to scale), "Up close" (lens)
js/content.js           loads and tidies the content files
content/artworks.json   ← the paintings (edited through Pages CMS)
content/site.json       ← name, bio, contact details (edited through Pages CMS)
images/                 painting photos
.pages.yml              tells Pages CMS which form fields to show
.github/workflows/      shrinks uploaded photos, strips GPS data, publishes the site
```

The current paintings, bio and contact details are **placeholders**: the paintings
were generated, the WhatsApp number is `966500000000`, and the email is `hello@example.com`.

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from the file system won't work, because browsers
block `fetch()` of local files.

## Put it online (one time, ~10 minutes)

1. Create a GitHub account for Simi, or use yours. A repo named
   `<username>.github.io` gives the cleanest address: `https://<username>.github.io/`.
   Any other repo name works too, at `https://<username>.github.io/<repo>/`.
2. Push this folder to the repo's `main` branch. The repo must be **public**
   for free GitHub Pages.
3. In the repo, go to **Settings → Pages → Build and deployment → Source** and
   choose **GitHub Actions**.
4. The **Publish site** workflow runs on every push. The site is live once it goes green.
5. Optional: uncomment the `og:image` line in `index.html` and put the real URL
   in it, so links shared on WhatsApp show a painting preview.

## Let Simi edit it

1. Go to [app.pagescms.org](https://app.pagescms.org), sign in with GitHub, and
   open the repo.
2. Invite Simi as a collaborator by email from Pages CMS. She doesn't need a
   GitHub account.
3. She'll see two sections:
   - **Paintings**: add, reorder, edit or remove paintings. Each one has a title,
     photo, subject, description, an optional size in cm, and a "feature on the
     home page" switch.
   - **About & contact**: her bio, location, WhatsApp, email, Instagram and portrait.
4. Each save publishes automatically in about a minute.

Pages CMS works in a phone browser, so she can upload straight from her camera roll.

### Photo tips for Simi

- Shoot in daylight near a window, with no flash.
- Stand straight in front of the painting, not at an angle.
- Crop to the very edges of the canvas. The site adds the 3D edge and the shadow itself.
- Big phone photos are fine. They're shrunk automatically, and location data is removed.

## Custom domain and QR codes (later)

- Buy a domain (about $10–12 a year, e.g. from Cloudflare Registrar). Add it under
  **Settings → Pages → Custom domain**, and follow GitHub's DNS instructions.
- QR codes are at `/qr.html`. Codes printed for the `github.io` address keep
  working after you add a custom domain, because GitHub redirects the old address.

## Notes

- **Image metadata:** the workflow strips metadata (including GPS) and commits
  the smaller version back. The original upload still stays in the git history,
  so it's worth turning off location on the camera.
- **Page transitions** use the View Transitions API. Browsers without it simply
  switch pages instantly.
- To change the subjects, edit the `values` list for `category` in
  `.pages.yml`. The filters on the site follow whatever is used.
