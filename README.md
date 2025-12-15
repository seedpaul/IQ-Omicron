# IQ‑Omicron  
**Non‑clinical, browser‑native adaptive cognitive assessment engine**

---

## 🧠 What Is IQ‑Omicron?

IQ‑Omicron is a **client‑side, JavaScript‑powered adaptive assessment framework** that runs entirely in the browser — no server required. It blends modern psychometric concepts such as **Item Response Theory (IRT)** and **Computerized Adaptive Testing (CAT)** with static web deliverability, enabling:

- Static deployment (e.g., GitHub Pages)  
- Browser‑only computation and data storage  
- Exportable results and research logs  
- Modular item banks and assessment plans  

⚠️ **Important:** This project is **NOT a clinical or diagnostic instrument**. Scores are not valid for clinical interpretation, professional diagnosis, or high‑stakes decision making.

---

## 🚀 Highlights

- Adaptive scoring using IRT (2PL/3PL support)
- Quick and Standard assessment plans
- Fully static HTML/CSS/JS architecture
- Client‑side research data exports
- Local norm packs with custom overrides
- Offline storage via browser APIs
- Python tooling for calibration, norming, and DIF analysis

---

## 📁 Repository Structure

```
IQ‑Omicron/
├── index.html
├── styles.css
├── src/
│   ├── app.js
│   ├── plan.js
│   ├── items/
│   ├── core/
│   │   ├── index.js
│   │   ├── data/
│   │   ├── engine/
│   │   ├── render/
│   │   └── research/
│   └── engine/   # legacy
└── pipeline/
    ├── calibrate_2pl.py
    ├── dif_logistic.py
    ├── dif_mh.py
    ├── make_norm_pack.py
    └── README.md
```

---

## 🧪 Running Locally

This project requires no build step.

### Option 1 — Direct

Open `index.html` in a modern browser.

### Option 2 — Local Server (recommended)

```bash
npx serve .
# or
python -m http.server
```

---

## 📊 Assessment Modes

### Standard Mode
Full adaptive test across cognitive domains.

### Quick Mode
Short‑form adaptive estimate.

Both produce:
- IQ‑style scaled scores
- Percentile ranks
- Confidence intervals

---

## ➕ Item Banks

Item banks live in `src/items/`.  
To add new items:

1. Define domain items
2. Register them in `plan.js`
3. Reload — no rebuild required

---

## 📈 Norms & Research Pipeline

Python tools in `/pipeline` support:

- Item calibration (2PL)
- Norm pack generation
- DIF detection (MH, logistic)

Generated norm packs can be loaded directly into the UI.

---

## 🔒 Privacy & Ethics

All data remains **local to the browser**.

- No telemetry
- No server calls
- No analytics

Use responsibly and avoid clinical claims.

---

## 🧠 Psychometric Foundations

- Item Response Theory
- Computerized Adaptive Testing
- SEM‑based stopping rules
- Exposure control
- Percentile scaling

---

## 🛣 Roadmap

- Multi‑form equating
- Expanded norming
- Bayesian priors
- Longitudinal measurement
- Secure administration hooks

---

## ⚖️ License & Attribution

Authored by **Paul Seed**.

Provided for research and educational use only.
