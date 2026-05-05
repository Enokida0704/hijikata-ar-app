AFRAME.registerShader("chromakey", {
  schema: {
    src: { type: "map" },
    color: { type: "color", default: "#00ff00" },
    similarity: { type: "number", default: 0.28 },
    smoothness: { type: "number", default: 0.08 },
    spill: { type: "number", default: 0.12 },
    opacity: { type: "number", default: 1.0 },
  },

  init(data) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: data.src },
        keyColor: { value: new THREE.Color(data.color) },
        similarity: { value: data.similarity },
        smoothness: { value: data.smoothness },
        spill: { value: data.spill },
        opacity: { value: data.opacity },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 keyColor;
        uniform float similarity;
        uniform float smoothness;
        uniform float spill;
        uniform float opacity;
        varying vec2 vUv;

        vec2 rgb2uv(vec3 rgb) {
          return vec2(
            rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5 + 0.5,
            rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081 + 0.5
          );
        }

        void main() {
          vec4 videoColor = texture2D(map, vUv);
          vec2 videoUV = rgb2uv(videoColor.rgb);
          vec2 keyUV = rgb2uv(keyColor);
          float distanceToKey = distance(videoUV, keyUV);

          float alpha = smoothstep(similarity, similarity + smoothness, distanceToKey);

          float greenAmount = max(videoColor.g - max(videoColor.r, videoColor.b), 0.0);
          vec3 desaturated = mix(videoColor.rgb, vec3(videoColor.r * 0.5 + videoColor.b * 0.5), greenAmount * spill);

          gl_FragColor = vec4(desaturated, videoColor.a * alpha * opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  },

  update(data) {
    if (!this.material) return;
    this.material.uniforms.map.value = data.src;
    this.material.uniforms.keyColor.value.set(data.color);
    this.material.uniforms.similarity.value = data.similarity;
    this.material.uniforms.smoothness.value = data.smoothness;
    this.material.uniforms.spill.value = data.spill;
    this.material.uniforms.opacity.value = data.opacity;
  },
});

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
    character.setAttribute("opacity", 0);
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
    character.setAttribute("animation__fadein", "property: opacity; from: 0; to: 1; dur: 360; easing: easeOutQuad");
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
