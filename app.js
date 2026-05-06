AFRAME.registerShader("chromakey", {
  schema: {
    src: { type: "map", is: "uniform" },
    color: { type: "color", is: "uniform", default: "#217552" },
    similarity: { type: "number", is: "uniform", default: 0.10 },
    smoothness: { type: "number", is: "uniform", default: 0.08 },
    spill: { type: "number", is: "uniform", default: 0.18 },
    opacity: { type: "number", is: "uniform", default: 1.0 },
  },

  update: function (data) {
    const materialData = this.el.components.material.data;
    materialData.transparent = true;
    materialData.depthWrite = false;
    materialData.alphaTest = 0.01;
    materialData.side = "double";

    this.material.transparent = true;
    this.material.depthWrite = false;
    this.material.alphaTest = 0.01;
    this.material.side = THREE.DoubleSide;

    if (this.material.uniforms.opacity) {
      this.material.uniforms.opacity.value = data.opacity;
    }
  },

  vertexShader: [
    "varying vec2 vUV;",
    "void main(void) {",
    "  vUV = uv;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}",
  ].join("\n"),

  fragmentShader: [
    "precision mediump float;",
    "uniform sampler2D src;",
    "uniform vec3 color;",
    "uniform float similarity;",
    "uniform float smoothness;",
    "uniform float spill;",
    "uniform float opacity;",
    "varying vec2 vUV;",
    "vec2 rgbToCbCr(vec3 c) {",
    "  float cb = -0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b;",
    "  float cr =  0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b;",
    "  return vec2(cb, cr);",
    "}",
    "void main(void) {",
    "  vec4 videoColor = texture2D(src, vUV);",
    "  vec2 videoCbCr = rgbToCbCr(videoColor.rgb);",
    "  vec2 keyCbCr = rgbToCbCr(color);",
    "  float chromaDistance = distance(videoCbCr, keyCbCr);",
    "  float chromaAlpha = smoothstep(similarity, similarity + smoothness, chromaDistance);",
    "  float greenDominance = videoColor.g - max(videoColor.r, videoColor.b);",
    "  float greenMask = smoothstep(0.03, 0.12, greenDominance);",
    "  float alpha = mix(1.0, chromaAlpha, greenMask);",
    "  vec3 despilled = videoColor.rgb;",
    "  float spillAmount = (1.0 - alpha) * spill;",
    "  despilled.g = mix(despilled.g, (despilled.r + despilled.b) * 0.5, spillAmount);",
    "  gl_FragColor = vec4(despilled, videoColor.a * alpha * opacity);",
    "}",
  ].join("\n"),
});

// chromakey / similarity / smoothness: 素材ごとに値を調整して境界品質を最適化する。
// 例: color は #217552 のように素材の実背景色へ合わせて指定する。

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const scene = document.querySelector("a-scene");
  const targetRoot = document.getElementById("targetRoot");
  const spawnRoot = document.getElementById("spawnRoot");
  const character = document.getElementById("character");
  const smoke = document.getElementById("smoke");
  const glow = document.getElementById("glow");
  const hijikataVideo = document.getElementById("hijikataVideo");
  const debugStatus = document.getElementById("debugStatus");

  let started = false;
  let active = false;
  let sceneReady = false;

  const setVisiblePack = (visible) => {
    spawnRoot.setAttribute("visible", visible);
  };

  const clearAnimations = () => {
    [
      [spawnRoot, "animation__spawn"],
      [character, "animation__fadein"],
      [smoke, "animation__smokein"],
      [glow, "animation__glowin"],
    ].forEach(([el, name]) => el.removeAttribute(name));
  };

  const resetPose = () => {
    clearAnimations();
    spawnRoot.setAttribute("position", "0.0 -0.2 0.18");
    spawnRoot.setAttribute("scale", "0.001 0.001 0.001");
    character.setAttribute("material", "opacity", 0);
    smoke.setAttribute("opacity", 0);
    glow.setAttribute("opacity", 0);
    character.setAttribute("rotation", "0 0 0");
  };

  const startSequence = () => {
    resetPose();
    setVisiblePack(true);

    if (hijikataVideo) {
      hijikataVideo.currentTime = 0;
      const playPromise = hijikataVideo.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    }

    spawnRoot.setAttribute("animation__spawn", "property: scale; from: 0.001 0.001 0.001; to: 0.68 0.68 0.68; dur: 460; easing: easeOutBack");
    character.setAttribute("animation__fadein", "property: material.opacity; from: 0; to: 1; dur: 360; easing: easeOutQuad");
    smoke.setAttribute("animation__smokein", "property: opacity; from: 0; to: 0.62; dur: 320; easing: easeOutQuad");
    glow.setAttribute("animation__glowin", "property: opacity; from: 0; to: 0.65; dur: 450; easing: easeOutQuad");
  };

  const stopSequence = () => {
    if (hijikataVideo) {
      hijikataVideo.pause();
      hijikataVideo.currentTime = 0;
    }
    resetPose();
    setVisiblePack(false);
  };

  const getMindarSystem = () => scene.systems?.["mindar-image-system"];

  const setStartButtonState = (enabled, label) => {
    startButton.disabled = !enabled;
    if (label) startButton.textContent = label;
  };

  const setDebug = (message) => {
    console.log("[AR DEBUG]", message);
    if (debugStatus) debugStatus.textContent = `debug: ${message}`;
  };

  setStartButtonState(false, "初期化中...");

  const markSceneReady = () => {
    sceneReady = true;
    setStartButtonState(true, "ARを開始");
    setDebug("scene loaded / button enabled");
  };

  if (scene.hasLoaded) {
    markSceneReady();
  } else {
    scene.addEventListener("loaded", markSceneReady, { once: true });
  }

  startButton.addEventListener("click", async () => {
    if (started) return;
    if (!sceneReady) {
      setDebug("blocked: scene not ready");
      alert("ARエンジンの初期化待ちです。数秒後にもう一度お試しください。");
      return;
    }

    if (!window.isSecureContext && location.hostname !== "localhost") {
      setDebug("blocked: insecure context");
      alert("HTTPSで開かれていないためカメラを利用できません。HTTPS環境で再度開いてください。");
      return;
    }

    const system = getMindarSystem();
    if (!system) {
      setDebug("blocked: mindar system missing");
      alert("ARシステムの初期化に失敗しました。ページを再読み込みして再試行してください。");
      return;
    }

    try {
      await system.start();
      started = true;
      setDebug("system.start() success / hiding overlay");
      overlay.style.display = "none";
      overlay.classList.add("overlay-hidden-debug");
    } catch (error) {
      console.error(error);
      setDebug(`system.start() failed: ${error?.name || "unknown"}`);
      alert("カメラを開始できませんでした。ブラウザのカメラ権限とHTTPS環境を確認してください。");
    }
  });

  targetRoot.addEventListener("targetFound", () => {
    if (active) return;
    active = true;
    startSequence();
  });

  targetRoot.addEventListener("targetLost", () => {
    active = false;
    stopSequence();
  });

  scene.addEventListener("arError", (event) => {
    console.error("MindAR error", event?.detail || event);
    setDebug("arError event fired");
    if (!started) return;
    alert("ARの実行中にエラーが発生しました。ページを再読み込みしてください。");
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    if (started) {
      const system = getMindarSystem();
      if (system) system.stop();
      started = false;
      active = false;
      stopSequence();
      overlay.style.display = "grid";
      setDebug("page hidden: system stopped / overlay shown");
    }
  });

  setDebug("init complete");
});
