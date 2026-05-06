AFRAME.registerShader("soft-chromakey", {
  schema: {
    src: { type: "map", is: "uniform" },
    keyColor: { type: "color", is: "uniform", default: "#20904f" },
    similarity: { type: "number", is: "uniform", default: 0.16 },
    smoothness: { type: "number", is: "uniform", default: 0.05 },
    spill: { type: "number", is: "uniform", default: 0.08 },
    alphaTest: { type: "number", is: "uniform", default: 0.03 },
  },

  init(data) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        src: { value: null },
        keyColor: { value: new THREE.Color() },
        similarity: { value: 0.16 },
        smoothness: { value: 0.05 },
        spill: { value: 0.08 },
        alphaTest: { value: 0.03 },
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.update(data);
  },

  update(data) {
    const uniforms = this.material.uniforms;

    uniforms.src.value = data.src;
    uniforms.keyColor.value.set(data.keyColor);
    uniforms.similarity.value = data.similarity;
    uniforms.smoothness.value = data.smoothness;
    uniforms.spill.value = data.spill;
    uniforms.alphaTest.value = data.alphaTest;

    this.material.needsUpdate = true;
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D src;
    uniform vec3 keyColor;
    uniform float similarity;
    uniform float smoothness;
    uniform float spill;
    uniform float alphaTest;

    varying vec2 vUv;

    vec2 rgbToCbCr(vec3 color) {
      return vec2(
        0.5 + (color.b - color.r) * 0.564,
        0.5 + (color.r - color.g) * 0.713
      );
    }

    void main() {
      vec4 texel = texture2D(src, vUv);
      float chromaDistance = distance(rgbToCbCr(texel.rgb), rgbToCbCr(keyColor));
      float foreground = smoothstep(similarity, similarity + smoothness, chromaDistance);
      float alpha = texel.a * foreground;

      if (alpha < alphaTest) {
        discard;
      }

      float spillMask = 1.0 - smoothstep(similarity, similarity + spill, chromaDistance);
      float neutralGreen = max(texel.r, texel.b) * 1.05;
      texel.g = mix(texel.g, min(texel.g, neutralGreen), spillMask);

      gl_FragColor = vec4(texel.rgb, alpha);
    }
  `,
});
