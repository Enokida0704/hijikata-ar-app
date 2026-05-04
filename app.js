document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const scene = document.querySelector("a-scene");
  const targetRoot = document.getElementById("targetRoot");
  const spawnRoot = document.getElementById("spawnRoot");
  const character = document.getElementById("character");
  const beer = document.getElementById("beer");
  const smoke = document.getElementById("smoke");
  const glow = document.getElementById("glow");
  const shadow = document.getElementById("shadow");
  const caption = document.getElementById("caption");
  const hijikataVideo = document.getElementById("hijikataVideo");
  const debugStatus = document.getElementById("debugStatus");

  let started = false;
  let active = false;
  let sceneReady = false;

  const setVisiblePack = (visible) => {
    spawnRoot.setAttribute("visible", visible);
    caption.setAttribute("visible", visible);
  };

  const clearAnimations = () => {
    [
      [spawnRoot, "animation__spawn"],
      [character, "animation__fadein"],
      [beer, "animation__fadein"],
      [smoke, "animation__smokein"],
      [glow, "animation__glowin"],
      [beer, "animation__toastmove"],
      [beer, "animation__toastrot"],
      [beer, "animation__drinkmove"],
      [beer, "animation__drinkrot"],
      [character, "animation__nod"],
    ].forEach(([el, name]) => el.removeAttribute(name));
  };

  const resetPose = () => {
    clearAnimations();
    spawnRoot.setAttribute("position", "0.0 -0.2 0.18");
    spawnRoot.setAttribute("scale", "0.001 0.001 0.001");
    character.setAttribute("opacity", 0);
    beer.setAttribute("opacity", 0);
    smoke.setAttribute("opacity", 0);
    glow.setAttribute("opacity", 0);
    shadow.setAttribute("opacity", 0.72);
    beer.setAttribute("position", "0.27 -0.03 0.02");
    beer.setAttribute("rotation", "0 0 0");
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
    beer.setAttribute("animation__fadein", "property: opacity; from: 0; to: 1; dur: 360; easing: easeOutQuad");
    smoke.setAttribute("animation__smokein", "property: opacity; from: 0; to: 0.62; dur: 320; easing: easeOutQuad");
    glow.setAttribute("animation__glowin", "property: opacity; from: 0; to: 0.65; dur: 450; easing: easeOutQuad");
    setTimeout(() => {
      beer.setAttribute("animation__toastmove", "property: position; from: 0.27 -0.03 0.02; to: 0.22 0.25 0.09; dur: 900; easing: easeInOutSine");
      beer.setAttribute("animation__toastrot", "property: rotation; from: 0 0 0; to: 0 0 18; dur: 900; easing: easeInOutSine");
    }, 280);

    setTimeout(() => {
      beer.setAttribute("animation__drinkmove", "property: position; from: 0.22 0.25 0.09; to: 0.12 0.33 0.11; dir: alternate; dur: 600; loop: 2; easing: easeInOutSine");
      beer.setAttribute("animation__drinkrot", "property: rotation; from: 0 0 18; to: 0 0 34; dir: alternate; dur: 600; loop: 2; easing: easeInOutSine");
      character.setAttribute("animation__nod", "property: rotation; from: 0 0 0; to: 0 0 -3; dir: alternate; dur: 600; loop: 2; easing: easeInOutSine");
    }, 1250);
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
