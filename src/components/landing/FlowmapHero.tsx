"use client";

/**
 * src/components/landing/FlowmapHero.tsx
 * Mouse-driven fluid image distortion, ported from robin-dela/flowmap-effect
 * (https://github.com/robin-dela/flowmap-effect, Codrops) onto OGL's npm
 * package instead of the demo's bundled build. Renders a full-bleed <canvas>
 * that reacts to cursor/touch movement; the underlying image is otherwise
 * static, so this degrades to nothing (parent's own background shows through)
 * if WebGL is unavailable or the user prefers reduced motion.
 */

import { useEffect, useRef } from "react";
import { Renderer, Geometry, Program, Mesh, Texture, Vec2, Vec4, Flowmap } from "ogl";

interface Props {
  src: string;
  /** Natural pixel dimensions of `src`, used to letterbox like object-cover without stretching. */
  imgSize: [number, number];
  className?: string;
}

export function FlowmapHero({ src, imgSize, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let renderer: Renderer;
    try {
      renderer = new Renderer({ dpr: Math.min(2, window.devicePixelRatio || 1), alpha: true });
    } catch {
      // WebGL unavailable — leave the static background in place.
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";

    let destroyed = false;
    let aspect = 1;
    const mouse = new Vec2(-1);
    const velocity = new Vec2();

    const flowmap = new Flowmap(gl);

    // Triangle that includes -1 to 1 range for 'position', and 0 to 1 range for 'uv'.
    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
    });

    const texture = new Texture(gl, { minFilter: gl.LINEAR, magFilter: gl.LINEAR });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      texture.image = img;
    };
    img.src = src;

    function computeAspectCorrection(): [number, number] {
      const imageAspect = imgSize[1] / imgSize[0];
      if (window.innerHeight / window.innerWidth < imageAspect) {
        return [1, window.innerHeight / window.innerWidth / imageAspect];
      }
      return [(window.innerWidth / window.innerHeight) * imageAspect, 1];
    }

    const [a1Init, a2Init] = computeAspectCorrection();

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        tWater: { value: texture },
        res: { value: new Vec4(window.innerWidth, window.innerHeight, a1Init, a2Init) },
        tFlow: flowmap.uniform,
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container) return;
      const { clientWidth: w, clientHeight: h } = container;
      const [a1, a2] = computeAspectCorrection();
      program.uniforms.res.value = new Vec4(w, h, a1, a2);
      renderer.setSize(w, h);
      aspect = w / h;
    }
    window.addEventListener("resize", resize, false);
    resize();

    const lastMouse = new Vec2();
    let lastTime: number | undefined;

    function updateMouse(e: MouseEvent | TouchEvent) {
      let x: number, y: number;
      if ("changedTouches" in e && e.changedTouches.length) {
        x = e.changedTouches[0]!.pageX;
        y = e.changedTouches[0]!.pageY;
      } else {
        x = (e as MouseEvent).pageX;
        y = (e as MouseEvent).pageY;
      }

      const rect = container!.getBoundingClientRect();
      const localX = x - rect.left;
      const localY = y - rect.top;

      mouse.set(localX / gl.renderer.width, 1 - localY / gl.renderer.height);

      if (!lastTime) {
        lastTime = performance.now();
        lastMouse.set(x, y);
      }

      const deltaX = x - lastMouse.x;
      const deltaY = y - lastMouse.y;
      lastMouse.set(x, y);

      const time = performance.now();
      const delta = Math.max(10.4, time - lastTime);
      lastTime = time;

      velocity.x = deltaX / delta;
      velocity.y = deltaY / delta;
      // @ts-expect-error — flag used to detect idle frames, not part of Vec2's type
      velocity.needsUpdate = true;
    }

    const isTouchCapable = "ontouchstart" in window;
    if (isTouchCapable) {
      container.addEventListener("touchstart", updateMouse, false);
      container.addEventListener("touchmove", updateMouse, { passive: true });
    } else {
      container.addEventListener("mousemove", updateMouse, false);
    }

    let rafId: number;
    function update(t: number) {
      rafId = requestAnimationFrame(update);
      // @ts-expect-error — see updateMouse
      if (!velocity.needsUpdate) {
        mouse.set(-1);
        velocity.set(0, 0);
      }
      // @ts-expect-error — see updateMouse
      velocity.needsUpdate = false;

      flowmap.aspect = aspect;
      flowmap.mouse.copy(mouse);
      // @ts-expect-error — len is a getter on ogl's Vec2
      flowmap.velocity.lerp(velocity, velocity.len ? 0.15 : 0.1);
      flowmap.update();

      program.uniforms.uTime.value = t * 0.01;
      renderer.render({ scene: mesh });
    }
    rafId = requestAnimationFrame(update);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      container.removeEventListener("touchstart", updateMouse);
      container.removeEventListener("touchmove", updateMouse);
      container.removeEventListener("mousemove", updateMouse);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      void destroyed;
    };
  }, [src, imgSize]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  precision highp int;
  uniform sampler2D tWater;
  uniform sampler2D tFlow;
  uniform float uTime;
  varying vec2 vUv;
  uniform vec4 res;

  void main() {
    // R and G values are velocity in the x and y direction
    // B value is the velocity length
    vec3 flow = texture2D(tFlow, vUv).rgb;

    vec2 uv = .5 * gl_FragCoord.xy / res.xy;
    vec2 myUV = (uv - vec2(0.5)) * res.zw + vec2(0.5);
    myUV -= flow.xy * (0.15 * 0.7);

    vec3 tex = texture2D(tWater, myUV).rgb;

    gl_FragColor = vec4(tex.r, tex.g, tex.b, 1.0);
  }
`;
