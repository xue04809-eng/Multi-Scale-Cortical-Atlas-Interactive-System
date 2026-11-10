# Multi-Scale Cortical Atlas Interactive System

An interactive, browser-based viewer for multi-scale cortical atlases. It renders parcel-level cortical surfaces in six synchronized 3D views and supports scale switching, cross-scale parcel mapping, network filtering, connectivity exploration, scalar/time-series overlays, and publication-ready figure export.

Built with **Three.js** (frontend) and **Flask** (backend).

## Requirements

| Dependency | Version | Purpose                       |
| ---------- | ------- | ----------------------------- |
| Node.js    | >= 18   | Frontend build and dev server |
| npm        | >= 9    | Ships with Node.js            |
| Python     | >= 3.8  | Backend service               |

Verify your environment:

```bash
node -v
npm -v
python --version
```

## Installation

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

## Running

The frontend and backend must run **simultaneously**, each in its own terminal.

**Terminal 1 - backend (port 5000):**

```bash
npm run backend
```

**Terminal 2 - frontend (port 3000, opens automatically):**

```bash
npm run dev
```

Open http://localhost:3000. The dev server proxies all `/api` requests to `http://localhost:5000`.

**Production build:**

```bash
npm run build
```

## Usage

| Input        | Format                      | Description           |
| ------------ | --------------------------- | --------------------- |
| Scalar map   | `.txt` `.csv`  `.npy` | One value per parcel  |
| Time series  | `.txt` `.csv` `.npy`  | Parcel × time matrix |
| CIFTI series | `.ptseries.nii`           | Parsed by the backend |

Supported atlases: **Schaefer** (100–1000 parcels), **AAL**, **HCP360**.

## Commands

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `npm run dev`     | Dev server with hot reload    |
| `npm run build`   | Production build to `dist/` |
| `npm run backend` | Start the Flask backend       |

---

## Tech Stack

**Frontend:** Three.js (3D rendering), Ractive.js (reactive UI), Chart.js (charts), npyjs (NumPy parsing), Webpack 5 (bundler)

**Backend:** Flask, Flask-CORS, NumPy, NiBabel (CIFTI-2 parsing)

---

## Project Structure

```
.
├── src/                    # Frontend source
│   ├── main.js             # Entry point
│   ├── Atlascontrol/       # Atlas configuration and loading
│   ├── views/              # Six 3D views and camera controls
│   ├── Cross-scale/        # Cross-scale parcel mapping
│   ├── Dataanalysis/       # Scalar and time-series overlays
│   ├── connectivity/       # Functional connectivity
│   ├── Network-fliter/     # Network filtering
│   ├── Search/             # Parcel search
│   ├── Export/             # Figure export
│   └── UI/                 # Templates and styles
├── backend/                # Flask service
│   ├── app.py              # Application entry point
│   ├── config.py           # Server and upload settings
│   ├── routes/             # API blueprints
│   ├── services/           # Business logic
│   ├── parser/             # CIFTI-2 parser
│   └── requirements.txt
├── dist/                   # Build output and static assets
│   └── public/models/atlases/  # VTK parcels per atlas
├── webpack.config.js
└── package.json
```

---

## Notes

- Edits to `src/` hot-reload automatically; changes to `webpack.config.js` or `package.json` require a restart.
- The backend accepts uploads up to 1 GB and cleans up temporary files after parsing.
- Parcel geometry lives in `dist/public/models/atlases/`; keep this directory intact or the viewer cannot load surfaces.
