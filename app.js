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

  let started = false;
  let active = false;

  const setVisiblePack = (visible) => {
    spawnRoot.setAttribute("visible", visible);
    caption.setAttribute("visible", visible);
  };

  const clearAnimations = () => {
    [
      [spawnRoot, "animation__spawn"],
      [spawnRoot, "animation__bob"],
      [character, "animation__fadein"],
      [beer, "animation__fadein"],
      [smoke, "animation__smokein"],
      [smoke, "animation__smokefloat"],
      [glow, "animation__glowin"],
      [beer, "animation__toastmove"],
      [beer, "animation__toastrot"],
      [beer, "animation__drinkmove"],
      [beer, "animation__drinkrot"],
      [character, "animation__nod"],
      [shadow, "animation__shadowpulse"]
    ].forEach(([el, name]) => el.removeAttribute(name));
  };

  const resetPose = () => {
    clearAnimations();
    spawnRoot.setAttribute("position", "0.75 -0.25 0.25");
    spawnRoot.setAttribute("scale", "0.001 0.001 0.001");
    character.setAttribute("opacity", 0);
    beer.setAttribute("opacity", 0);
    smoke.setAttribute("opacity", 0);
    glow.setAttribute("opacity", 0);
    shadow.setAttribute("opacity", 0.65);
    beer.setAttribute("position", "0.27 -0.03 0.02");
    beer.setAttribute("rotation", "0 0 0");
    character.setAttribute("rotation", "0 0 0");
  };

  const startSequence = () => {
    resetPose();
    setVisiblePack(true);

    spawnRoot.setAttribute("animation__spawn", "property: scale; from: 0.001 0.001 0.001; to: 0.6 0.6 0.6; dur: 420; easing: easeOutBack");
    character.setAttribute("animation__fadein", "property: opacity; from: 0; to: 1; dur: 360; easing: easeOutQuad");
    beer.setAttribute("animation__fadein", "property: opacity; from: 0; to: 1; dur: 360; easing: easeOutQuad");
    smoke.setAttribute("animation__smokein", "property: opacity; from: 0; to: 0.72; dur: 320; easing: easeOutQuad");
    smoke.setAttribute("animation__smokefloat", "property: position; from: 0 -0.08 -0.06; to: 0 0.03 -0.06; dur: 1200; easing: easeOutSine");
    glow.setAttribute("animation__glowin", "property: opacity; from: 0; to: 0.82; dur: 450; easing: easeOutQuad");
    shadow.setAttribute("animation__shadowpulse", "property: scale; from: 1 1 1; to: 1.06 1.06 1.06; dir: alternate; dur: 1200; easing: easeInOutSine; loop: true");

    setTimeout(() => {
      spawnRoot.setAttribute("animation__bob", "property: position; from: 0.75 -0.25 0.25; to: 0.75 -0.22 0.25; dir: alternate; dur: 1200; easing: easeInOutSine; loop: true");
      beer.setAttribute("animation__toastmove", "property: position; from: 0.27 -0.03 0.02; to: 0.22 0.25 0.09; dur: 900; easing: easeInOutSine");
      beer.setAttribute("animation__toastrot", "property: rotation; from: 0 0 0; to: 0 0 18; dur: 900; easing: easeInOutSine");
    }, 250);

    setTimeout(() => {
      beer.setAttribute("animation__drinkmove", "property: position; from: 0.22 0.25 0.09; to: 0.12 0.33 0.11; dir: alternate; dur: 600; loop: 2; easing: easeInOutSine");
      beer.setAttribute("animation__drinkrot", "property: rotation; from: 0 0 18; to: 0 0 34; dir: alternate; dur: 600; loop: 2; easing: easeInOutSine");
      character.setAttribute("animation__nod", "property: rotation; from: 0 0 0; to: 0 0 -3; dir: alternate; dur: 600; loop: 2; easing: easeInOutSine");
    }, 1250);
  };

  const stopSequence = () => {
    resetPose();
    setVisiblePack(false);
  };

  startButton.addEventListener("click", async () => {
    if (started) return;
    const system = scene.systems["mindar-image-system"];
    try {
      await system.start();
      started = true;
      overlay.style.display = "none";
    } catch (error) {
      console.error(error);
      alert("カメラを開始できませんでした。HTTPS環境（GitHub Pagesなど）で開いてください。");
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

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    if (started) {
      const system = scene.systems["mindar-image-system"];
      if (system) system.stop();
      started = false;
      active = false;
      stopSequence();
      overlay.style.display = "grid";
    }
  });
});
