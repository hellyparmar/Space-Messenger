import * as THREE from 'three';

let _circleTexture: THREE.Texture | null = null;

/**
 * Returns a singleton soft-circle CanvasTexture.
 * Apply this as `map` on every PointsMaterial to eliminate
 * the default square-particle artifact.
 */
export function getCircleTexture(): THREE.Texture {
  if (_circleTexture) return _circleTexture;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0,   'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  _circleTexture = new THREE.CanvasTexture(canvas);
  return _circleTexture;
}
