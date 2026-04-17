import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Bloom + tone mapping の EffectComposer ラッパ。
 * Phase F: 「AR 演出」の基本としてのグロー効果。
 *
 * - bloom 無効時は renderer.render() を直接呼ぶ (composer コスト回避)
 * - bloom 有効時は UnrealBloomPass + OutputPass
 */
export class PostFX {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  enabled: boolean = false;

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,   // strength
      0.4,   // radius
      0.85,  // threshold
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  setStrength(v: number): void { this.bloomPass.strength = v; }

  resize(w: number, h: number): void {
    this.composer.setSize(w, h);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.enabled) {
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }
}
