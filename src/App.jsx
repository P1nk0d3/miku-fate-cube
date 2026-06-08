import { useEffect, useRef, useState } from "react";
import { FastForward, Pause, Play, Rewind, Volume2 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(ScrollTrigger);
if (typeof window !== "undefined") {
  window.ScrollTrigger = ScrollTrigger;
}

function MikuSignalField() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const teal = new THREE.Color("#38ffe2");
    const violet = new THREE.Color("#8d5cff");
    const magenta = new THREE.Color("#ff43d4");
    const group = new THREE.Group();
    scene.add(group);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 2),
      new THREE.MeshBasicMaterial({
        color: teal,
        wireframe: true,
        transparent: true,
        opacity: 0.82,
      }),
    );
    group.add(core);

    const haloA = new THREE.Mesh(
      new THREE.TorusGeometry(1.74, 0.018, 12, 220),
      new THREE.MeshBasicMaterial({ color: magenta, transparent: true, opacity: 0.74 }),
    );
    haloA.rotation.x = Math.PI / 2.8;
    group.add(haloA);

    const haloB = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.36, 0.024, 360, 10, 5, 8),
      new THREE.MeshBasicMaterial({ color: violet, transparent: true, opacity: 0.58, wireframe: true }),
    );
    group.add(haloB);

    const count = 1100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const randomRadius = gsap.utils.random(1.85, 3.25, 0.01, true);
    const randomDepth = gsap.utils.random(-1.5, 1.5, 0.01, true);

    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 16;
      const radius = randomRadius();
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle * 1.34) * 1.1;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.48 + randomDepth();

      const color = i % 9 === 0 ? magenta : i % 5 === 0 ? violet : teal;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        size: 0.026,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    group.add(particles);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y = elapsed * 0.22;
      group.rotation.x = Math.sin(elapsed * 0.42) * 0.22;
      core.rotation.x = elapsed * 0.72;
      core.rotation.z = -elapsed * 0.52;
      haloA.rotation.z = elapsed * 0.64;
      haloB.rotation.y = -elapsed * 0.36;
      particles.rotation.y = elapsed * 0.12;
      frame = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      mount.removeChild(renderer.domElement);
      core.geometry.dispose();
      core.material.dispose();
      haloA.geometry.dispose();
      haloA.material.dispose();
      haloB.geometry.dispose();
      haloB.material.dispose();
      particleGeometry.dispose();
      particles.material.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="signal-field" aria-hidden="true" />;
}

function MusicPlayer() {
  const audioRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const activeTrack = tracks[index];

  useEffect(() => {
    const base = import.meta.env.BASE_URL || "/";
    fetch(`${base}music/playlist.json`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => setTracks(Array.isArray(items) ? items : []))
      .catch(() => setTracks([]));
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    audio.load();
    if (playing) audio.play().catch(() => setPlaying(false));
  }, [activeTrack, playing]);

  const changeTrack = (direction) => {
    if (!tracks.length) return;
    setIndex((current) => gsap.utils.wrap(0, tracks.length, current + direction));
    setProgress(0);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress(audio.currentTime / audio.duration);
  };

  const seek = (value) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Number(value) * audio.duration;
    setProgress(Number(value));
  };

  const base = import.meta.env.BASE_URL || "/";

  return (
    <aside className="music-dock" aria-label="音乐播放器">
      <audio
        ref={audioRef}
        src={activeTrack?.src ? `${base}${activeTrack.src}` : undefined}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => changeTrack(1)}
      />
      <div className="track-meta">
        <span className="signal-dot" />
        <span>{activeTrack?.title || "No mp3 tracks"}</span>
      </div>
      <div className="transport">
        <button type="button" onClick={() => changeTrack(-1)} disabled={!tracks.length} aria-label="上一首">
          <Rewind size={16} />
        </button>
        <button type="button" onClick={togglePlay} disabled={!tracks.length} aria-label={playing ? "暂停" : "播放"}>
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button type="button" onClick={() => changeTrack(1)} disabled={!tracks.length} aria-label="下一首">
          <FastForward size={16} />
        </button>
      </div>
      <input
        aria-label="播放进度"
        className="progress"
        type="range"
        min="0"
        max="1"
        step="0.001"
        value={progress}
        disabled={!tracks.length}
        onChange={(event) => seek(event.target.value)}
      />
      <label className="volume">
        <Volume2 size={15} />
        <input
          aria-label="音量"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </label>
    </aside>
  );
}

function FacePoem({ page, eyebrow, title, children, marks }) {
  return (
    <div className="poem">
      <p className="page-id">{page}</p>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{children}</p>
      <div className="mark-row" aria-hidden="true">
        {marks.map((mark) => (
          <span key={mark}>{mark}</span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const cube = root.querySelector(".cube");
    const flash = root.querySelector(".mutation-flash");
    const stage = root.querySelector(".scroll-stage");
    const fateGlyphs = gsap.utils.toArray(root.querySelectorAll(".face-fate .glyph"));
    const kaleidoCells = gsap.utils.toArray(root.querySelectorAll(".kaleido-cell"));
    const edgePulse = gsap.utils.pipe(
      (progress) => Math.min(Math.abs(progress - 0.25), Math.abs(progress - 0.75)),
      gsap.utils.mapRange(0.09, 0, 0, 1),
      gsap.utils.clamp(0, 1),
    );
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scrollTrigger;
    let fallbackTween;

    const renderProgress = (progress) => {
      const clamped = gsap.utils.clamp(0, 1, progress);
      const pulse = edgePulse(clamped);
      const faceIndex = Math.round(clamped * 2);
      root.dataset.face = String(faceIndex + 1);
      root.style.setProperty("--edge-pulse", pulse.toFixed(3));
      root.style.setProperty("--scroll-angle", `${Math.round(clamped * 360)}`);
      gsap.set(flash, { autoAlpha: pulse * 0.88, scaleX: 1 + pulse * 0.08 });
    };

    const fallbackRender = () => {
      const rect = stage.getBoundingClientRect();
      const travel = Math.max(1, stage.offsetHeight - window.innerHeight);
      const progress = gsap.utils.clamp(0, 1, -rect.top / travel);
      if (!ScrollTrigger.getById("miku-cube-scroll")) {
        fallbackTween?.kill();
        fallbackTween = gsap.to(cube, {
          rotationX: -180 * progress,
          duration: 0.22,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
      renderProgress(progress);
    };

    const goToFace = (direction) => {
      const trigger = ScrollTrigger.getById("miku-cube-scroll");
      if (!trigger) return;
      const progress = gsap.utils.normalize(trigger.start, trigger.end, window.scrollY);
      const current = Math.round(progress * 2);
      const next = gsap.utils.clamp(0, 2, current + direction);
      const y = gsap.utils.interpolate(trigger.start, trigger.end, next / 2);
      window.scrollTo({ top: y, behavior: "smooth" });
    };

    const onKey = (event) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        goToFace(1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        goToFace(-1);
      }
    };

    root.dataset.ready = "1";
    gsap.set(cube, { rotationX: 0, transformOrigin: "50% 50%" });

    if (!reduceMotion) {
      const tl = gsap.timeline({ paused: true });
      tl.to(cube, { rotationX: -90, duration: 1, ease: "power2.inOut" }, 0)
        .to(root, { "--world-a": "#25061d", "--world-b": "#ff43d4", duration: 0.06 }, 0.47)
        .from(fateGlyphs, { y: 46, autoAlpha: 0, stagger: 0.025, duration: 0.32 }, 0.52)
        .to(cube, { rotationX: -180, duration: 1, ease: "power2.inOut" }, 1)
        .to(root, { "--world-a": "#070713", "--world-b": "#ffe65f", duration: 0.06 }, 1.47)
        .from(kaleidoCells, { scale: 0, rotation: 90, autoAlpha: 0, stagger: 0.012, duration: 0.38 }, 1.52)
        .to(root.querySelector(".refrain-ring"), { rotation: 360, duration: 1, ease: "none" }, 1.52);

      scrollTrigger = ScrollTrigger.create({
        id: "miku-cube-scroll",
        trigger: stage,
        start: "top top",
        end: "+=2800",
        scrub: 0.9,
        pin: root.querySelector(".cube-pin"),
        anticipatePin: 1,
        animation: tl,
        onUpdate: (self) => renderProgress(self.progress),
      });
      ScrollTrigger.refresh();
      window.addEventListener("scroll", fallbackRender, { passive: true });
      fallbackRender();
    } else {
      gsap.set(flash, { autoAlpha: 0 });
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", fallbackRender);
      scrollTrigger?.kill();
      fallbackTween?.kill();
    };
  }, []);

  return (
    <main ref={rootRef} className="miku-app" data-face="1">
      <div className="mutation-flash" aria-hidden="true" />
      <MusicPlayer />

      <section className="scroll-stage" aria-label="初音未来长方体三面滚动叙事">
        <div className="cube-pin">
          <div className="cube-title">
            <span>HATSUNE MIKU</span>
            <span>Three Connected Faces</span>
          </div>
          <div className="cube-scene">
            <div className="prism-tilt">
              <div className="cube">
                <article className="face face-time" aria-label="第一页：时间">
                  <div className="face-grid time-grid" aria-hidden="true" />
                  <div className="time-orbit">
                    <MikuSignalField />
                    <span>THREE.JS LIVE ORBIT</span>
                  </div>
                  <img className="miku-portrait" src={`${import.meta.env.BASE_URL}images/ch_img_miku.png`} alt="初音未来" />
                  <FacePoem
                    page="Page 01"
                    eyebrow="Chronos / 声音开机"
                    title="时间不是流动，是被唱出的光"
                    marks={["00:00", "01", "∞"]}
                  >
                    下滑时，长方体沿着棱线转动。未来不是抵达，她在每一次合成声里重新诞生。
                  </FacePoem>
                  <p className="face-copy">FRONT FACE / TIME</p>
                </article>

                <article className="face face-fate" aria-label="第二页：宿命">
                  <div className="fate-grid" aria-hidden="true">
                    {Array.from({ length: 56 }).map((_, index) => (
                      <span className="glyph" key={index}>
                        {index % 4 === 0 ? "命" : index % 4 === 1 ? "MIKU" : index % 4 === 2 ? "∞" : "01"}
                      </span>
                    ))}
                  </div>
                  <div className="thread thread-a" aria-hidden="true" />
                  <div className="thread thread-b" aria-hidden="true" />
                  <img className="miku-shadow" src={`${import.meta.env.BASE_URL}images/ch_img_miku.png`} alt="" aria-hidden="true" />
                  <FacePoem
                    page="Page 02"
                    eyebrow="Moira / 谱面断裂"
                    title="宿命是写好的歌，也是被改写的拍"
                    marks={["FATE", "CUT", "REWRITE"]}
                  >
                    滚到两个面之间时，画风会短促突变：像磁带被剪开，又被无声地接回。
                  </FacePoem>
                  <p className="face-copy">TOP FACE / FATE</p>
                </article>

                <article className="face face-refrain" aria-label="第三页：轮回">
                  <div className="kaleidoscope" aria-hidden="true">
                    {Array.from({ length: 48 }).map((_, index) => (
                      <i className="kaleido-cell" key={index} style={{ "--i": index }} />
                    ))}
                  </div>
                  <div className="refrain-ring" aria-hidden="true">
                    <span>RE</span>
                    <span>CUR</span>
                    <span>SION</span>
                  </div>
                  <FacePoem
                    page="Page 03"
                    eyebrow="Refrain / 万花筒终章"
                    title="轮回把她折成无数个明天"
                    marks={["LOOP", "KAL", "EIDO"]}
                  >
                    第三个面不是结尾，而是折返。万花筒把同一个初音未来拆成不同的时间切片。
                  </FacePoem>
                  <p className="face-copy">BACK FACE / REFRAIN</p>
                </article>

                <div className="edge-plane edge-right" aria-hidden="true" />
                <div className="edge-plane edge-left" aria-hidden="true" />
                <div className="edge-plane edge-bottom" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="page-meter" aria-hidden="true">
            <span>01</span>
            <span>02</span>
            <span>03</span>
          </div>
        </div>
      </section>
    </main>
  );
}
