# ZC Smart Digital website

The complete source of https://zcsmartdigital.com: home page, service pages, privacy page and the portfolio demos under `demos/`.
Everything is plain HTML, CSS and JavaScript with no build step.

## Preview locally

```powershell
python -m http.server 8765
```

Then open http://localhost:8765/. Links are root-relative (`/demos/...`), so serve from this folder rather than opening files directly.

## Publish

```powershell
.\deploy.ps1
```

Run `.\deploy.ps1 -DryRun` first to check without uploading. You need to be logged in to Cloudflare once with `npx wrangler login`.

The site is served by two Cloudflare workers, and the script updates both:

| Worker | Serves |
|---|---|
| `blue-hill-dc43` | `/` and `/demos/*` (zone routes on zcsmartdigital.com and www) |
| `yellow-smoke-77ca` | everything else (custom domain) |

Each upload replaces all files of that worker, so always publish from this complete folder. The script first copies just the website files into `.wrangler\site` (no git data, deploy settings or this README) and uploads that. New files are included even before you commit them; anything in `.gitignore` is left out. Security headers live in `_headers`.

To undo a publish, open the worker in the Cloudflare dashboard → Deployments and roll back to the previous version.

## Notes

- Cloudflare Web Analytics adds its script to pages automatically. Don't paste it into the HTML, or it loads twice.
- `assets/video/ZC_Smart_Digital_Introduction.mp4` is referenced by the home page but is not in this folder or on the live site yet.
