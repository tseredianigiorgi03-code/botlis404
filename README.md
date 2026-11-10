# სიყვარულის ბოთლობანა - Georgian Love Bottle Game (Online)

ქართული ონლაინ რომანტიკული თამაში ბოთლობანა (Truth or Dare):
- რეალურ დროში ონლაინ რეჟიმი (Cloud MQTT/WSS)
- სიმართლე vs მოქმედება სტატისტიკა (`GameStatsModal`)
- MVP და აქტიური მოთამაშის გამოვლენა
- QR კოდით მეგობრების მოწვევა
- ჩატი, რეაქციები და კითხვების მენეჯერი

---

## Netlify Deployment Guide

### Option 1: Netlify Git Integration (Recommended)
1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Deploy to Netlify"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USER>/<REPO>.git
   git push -u origin main
   ```
2. In Netlify (https://app.netlify.com):
   - Click **"Add new site"** -> **"Import an existing project"** -> **GitHub**.
   - Select your repo.
   - Settings are automatically read from `netlify.toml`:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
     - **Node version**: `20`
   - Click **"Deploy site"**.

### Option 2: Netlify Drop (Instant Drag & Drop)
1. Run `npm run build` locally.
2. Drag and drop the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
