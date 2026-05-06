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

  const setDebug = (message) => {
    console.log("[AR DEBUG]", message);
    if (debugStatus) debugStatus.textContent = `debug: ${message}`;
  };

  const setStartButtonState = (enabled, label) => {
    startButton.disabled = !enabled;
    if (label) startButton.textContent = label;
  };

  const getMindarSystem = () => scene.systems?.["mindar-image-system"];

  const clearAnimations = () => {
    [
      [spawnRoot, "animation__spawn"],
      [smoke, "animation__smokein"],
      [glow, "animation__glowin"],
    ].forEach(([el, name]) => {
      if (el) el.removeAttribute(name);
    });
  };

  const resetPose = () => {
    clearAnimations();

    // HTML側の初期位置と揃える。ラベル中心の手前に表示する。
    spawnRoot.setAttribute("position", "0 0 0.28");
    spawnRoot.setAttribute("scale", "0.001 0.001 0.001");
    spawnRoot.setAttribute("visible", false);

    character.setAttribute("visible", false);
    character.setAttribute("rotation", "0 0 0");

    smoke.setAttribute("opacity", 0);
    glow.setAttribute("opacity", 0);
  };

  const startSequence = () => {
    resetPose();

    spawnRoot.setAttribute("visible", true);
    character.setAttribute("visible", true);

    if (hijikataVideo) {
      hijikataVideo.currentTime = 0;
      const playPromise = hijikataVideo.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    }

    spawnRoot.setAttribute(
      "animation__spawn",
      "property: scale; from: 0.001 0.001 0.001; to: 0.68 0.68 0.68; dur: 460; easing: easeOutBack"
    );

    smoke.setAttribute(
      "animation__smokein",
      "property: opacity; from: 0; to: 0.62; dur: 320; easing: easeOutQuad"
    );

    glow.setAttribute(
      "animation__glowin",
      "property: opacity; from: 0; to: 0.65; dur: 450; easing: easeOutQuad"
    );
  };

  const stopSequence = () => {
    if (hijikataVideo) {
      hijikataVideo.pause();
      hijikataVideo.currentTime = 0;
    }

    resetPose();
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
