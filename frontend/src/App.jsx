import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./App.css";


function applyTheme(theme = THEME) {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
}


function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

const SCAN_LOG = [
  "> booting probe...",
  "> sweeping network nodes...",
  "> matching signature...",
];

const GLYPHS = "01アイウエオカキクケコサシスセソ<>/\\{}[]#$%&*+=";

function Typewriter({ text }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className="description">
      {shown}
      <span className="cursor" />
    </p>
  );
}

export default function App() {

  const [THEME, SETHEME] = useState({
    bg: "#030806",
    surface: "#07130d",
    text: "#d7ffe6",
    muted: "#6fa687",
    idle: "#19d3ff",
    detected: "#00ff66",
    rain: "#00c853",
  })
  const [DESCRIPTION, SETDESCRIPTION] = useState(
    "USB device verified. No suspicious behavior was detected. " +
    "The device appears to be operating normally and no malicious input, " +
    "unauthorized commands, or abnormal USB activity was identified."
  )
  const mountRef = useRef(null);
  const statusRef = useRef("idle");
  const timers = useRef([]);
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState([]);


  useEffect(() => {
    applyTheme(THEME);

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const rainCanvas = document.createElement("canvas");
    const ctx = rainCanvas.getContext("2d");
    const rainTex = new THREE.CanvasTexture(rainCanvas);
    scene.background = rainTex;
    const FONT = 16;
    let drops = [];
    const bgRgb = hexToRgb(THEME.bg);

 
    const group = new THREE.Group();
    scene.add(group);

    const geo = new THREE.IcosahedronGeometry(3.3, 2);
    const wireMat = new THREE.MeshBasicMaterial({ color: THEME.idle, wireframe: true, transparent: true, opacity: 0.28 });
    group.add(new THREE.Mesh(geo, wireMat));

    const pointMat = new THREE.PointsMaterial({ color: THEME.idle, size: 0.07, transparent: true, opacity: 0.9 });
    group.add(new THREE.Points(geo, pointMat));

    const ringMat = new THREE.MeshBasicMaterial({ color: THEME.idle, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const scanRing = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.02, 8, 120), ringMat);
    scanRing.rotation.x = Math.PI / 2;
    group.add(scanRing);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rainCanvas.width = w;
      rainCanvas.height = h;
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, w, h);
      drops = Array.from({ length: Math.ceil(w / FONT) }, () => Math.random() * -50);
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = new THREE.Color(THEME.idle);
    const clock = new THREE.Clock();
    let frame = 0;
    let raf;

    const drawRain = (fast) => {
      ctx.fillStyle = `rgba(${bgRgb},0.09)`;
      ctx.fillRect(0, 0, rainCanvas.width, rainCanvas.height);
      ctx.font = `${FONT}px monospace`;
      drops.forEach((y, i) => {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        ctx.fillStyle = Math.random() > 0.96 ? THEME.text : THEME.rain; 
        ctx.fillText(ch, i * FONT, y * FONT);
        if (y * FONT > rainCanvas.height && Math.random() > (fast ? 0.9 : 0.975)) drops[i] = 0;
        drops[i] += fast ? 1.6 : 1;
      });
      rainTex.needsUpdate = true;
    };

    const tick = () => {
      const t = clock.getElapsedTime();
      const s = statusRef.current;
      frame += 1;

      if (!reduce && frame % 2 === 0) drawRain(s === "scanning");

      target.set(s === "detected" ? THEME.detected : THEME.idle);
      [wireMat, pointMat, ringMat].forEach((m) => m.color.lerp(target, 0.08));

      const spin = reduce ? 0 : s === "scanning" ? 0.03 : 0.004;
      group.rotation.y += spin;
      group.rotation.x += (mouse.y * 0.3 - group.rotation.x) * 0.03;

      scanRing.position.y =
        s === "scanning" ? Math.sin(t * 5) * 3.2 : s === "detected" ? 0 : Math.sin(t * 0.6) * 0.3;
      ringMat.opacity = s === "idle" ? 0.35 : 0.9;
      wireMat.opacity = s === "detected" ? 0.45 : 0.28;

      const k = s === "detected" ? 1.06 + Math.sin(t * 3) * 0.015 : 1;
      group.scale.lerp(new THREE.Vector3(k, k, k), 0.08);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      geo.dispose();
      scanRing.geometry.dispose();
      [wireMat, pointMat, ringMat].forEach((m) => m.dispose());
      rainTex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      timers.current.forEach(clearTimeout);
    };
  }, [THEME]);


  const setBoth = (s) => {
    statusRef.current = s;
    setStatus(s);
  };

  const detect = async () => {
    if (status !== "idle") return;
    setLog([]);
    setBoth("scanning");

    try {
      const res = await fetch("http://localhost:3000/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
      });
      const response = await res.json();
      if (response.detected === true) {
        SETHEME({
          bg: "#0a0203",       
          surface: "#1a080a",  
          text: "#ffe0e3",     
          muted: "#a85b63",    
          idle: "#ff2a4b",     
          detected: "#ff0033",
          rain: "#d60029",    
        })
        setBoth("detected")
        SETDESCRIPTION(
          "Malicious USB behavior detected. The connected device is behaving like " +
          "an unauthorized input device and may attempt to inject commands or execute " +
          "unwanted actions on the system. The device should be isolated immediately " +
          "and should not be trusted until it has been investigated."
        );

      }
    } catch (err) {
      console.error("Fetch failed:", err);
    }

    SCAN_LOG.forEach((line, i) =>
      timers.current.push(setTimeout(() => setLog((l) => [...l, line]), i * 650))
    );
    timers.current.push(setTimeout(() => setBoth("detected"), SCAN_LOG.length * 650 + 300));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setLog([]);
    setBoth("idle");
    window.location.reload();
  };

  const buttonText = status === "scanning" ? "Scanning..." : status === "detected" ? "Detected" : "Detect";
  const title = status === "detected" ? "DETECTED" : "DETECT";

  return (
    <div className={`app ${status}`}>
      <nav className="nav">
        <a className="brand" href="/">
          <span className="brand-mark">&gt;_</span>Thorappans
        </a>
        <span className="nav-status">
          <i className="dot" />
          {status === "idle" ? "standby" : status === "scanning" ? "scanning" : "target locked"}
        </span>
      </nav>

      <main className="hero">
        <div className="scene" ref={mountRef} aria-hidden="true" />

        <section className="terminal" aria-label="Detector">
          <header className="terminal-bar">
            <span className="lights"><i /><i /><i /></span>
            <span className="path">thorappans@detector:~$</span>
          </header>

          <div className="terminal-body">
            <h1 className="glitch" data-text={title}>{title}</h1>

            <div className="result" aria-live="polite">
              {status === "idle" && <p className="muted">Awaiting command. Press the button to start a scan.</p>}
              {status === "scanning" && (
                <ul className="log">
                  {log.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {status === "detected" && <Typewriter text={DESCRIPTION} />}
            </div>

            <div className="actions">
              <button className="detect-btn" onClick={detect} disabled={status !== "idle"}>
                {buttonText}
              </button>
              {status === "detected" && (
                <button className="reset-btn" onClick={reset}>reset</button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}