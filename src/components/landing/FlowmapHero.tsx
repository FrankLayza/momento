"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Texture, Flowmap } from "ogl";

interface FlowmapHeroProps {
  src: string;
  className?: string;
}

export function FlowmapHero({ src, className = "" }: FlowmapHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
    const gl = renderer.gl;

    const flowmap = new Flowmap(gl, {
      falloff: 0.25,
      dissipation: 0.94,
    });

    const texture = new Texture(gl, { minFilter: gl.LINEAR });
    const img = new Image();
    
    let aspectDimensions = { width: 1, height: 1 };

    img.src = src;
    img.onload = () => {
      texture.image = img;
      aspectDimensions = {
        width: img.naturalWidth || 1,
        height: img.naturalHeight || 1
      };
      if (canvas) canvas.style.opacity = "1";
      resize();
    };

    const program = new Program(gl, {
      vertex: `
        attribute vec2 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        uniform sampler2D tFlow;
        uniform vec2 uMeshScale;
        uniform vec2 uTextureScale;
        uniform float uIntensity; // THE LOCK: Defaults to 0
        varying vec2 vUv;

        void main() {
          vec2 uv = (vUv - 0.5) * uMeshScale / uTextureScale + 0.5;
          vec3 flow = texture2D(tFlow, vUv).rgb;
          
          // Multiply the flow effect by uIntensity. 
          // If uIntensity is 0, displacedUv is exactly equal to uv (perfect image).
          vec2 displacedUv = uv + (flow.rg * 0.04 * uIntensity);
          
          gl_FragColor = texture2D(tMap, displacedUv);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        tFlow: { value: flowmap.uniform },
        uMeshScale: { value: [1, 1] },
        uTextureScale: { value: [1, 1] },
        uIntensity: { value: 0.0 }, // Initialize lock to 0
      },
    });

    const geometry = new Triangle(gl);
    const mesh = new Mesh(gl, { geometry, program });

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let hasMoved = false; 
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const currentTargetX = (e.clientX - rect.left) / rect.width;
      const currentTargetY = 1.0 - (e.clientY - rect.top) / rect.height;

      if (!hasMoved) {
        mouse.x = currentTargetX;
        mouse.y = currentTargetY;
        hasMoved = true;
      }

      mouse.targetX = currentTargetX;
      mouse.targetY = currentTargetY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      renderer.setSize(width, height);

      const imageAspect = aspectDimensions.width / aspectDimensions.height;
      const containerAspect = width / height;

      if (containerAspect > imageAspect) {
        program.uniforms.uMeshScale.value = [1, 1 / containerAspect];
        program.uniforms.uTextureScale.value = [1, 1 / imageAspect];
      } else {
        program.uniforms.uMeshScale.value = [containerAspect, 1];
        program.uniforms.uTextureScale.value = [imageAspect, 1];
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let animationFrameId: number;
    const update = () => {
      animationFrameId = requestAnimationFrame(update);

      if (hasMoved) {
        // Linearly interpolate the tracking variables
        mouse.x += (mouse.targetX - mouse.x) * 0.1;
        mouse.y += (mouse.targetY - mouse.y) * 0.1;
        flowmap.mouse.set(mouse.x, mouse.y);
        
        // Smoothly fade in the distortion multiplier so it doesn't just snap on
        program.uniforms.uIntensity.value += (1.0 - program.uniforms.uIntensity.value) * 0.05;
      } else {
        flowmap.mouse.set(-1, -1);
      }

      flowmap.update();
      renderer.render({ scene: mesh });
    };
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src]);

  return (
    <div ref={containerRef} className={`pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block opacity-0 transition-opacity duration-300" />
    </div>
  );
}