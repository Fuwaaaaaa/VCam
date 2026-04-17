import * as THREE from 'three';

/**
 * Phase F: カメラ映像を背景として重ねるためのプレーン。
 * video element をテクスチャ化して全画面 quad に貼る。
 *
 * 透過背景モード (settings.transparentBg) が OFF で背景を映像にしたい場合
 * に使う想定。いまは最小実装 (VideoTexture のみ)。
 *
 * 将来: Selfie Segmentation のマスクとかけ合わせて「人物だけ切り抜き」を実装予定。
 */
export class CameraBackground {
  mesh: THREE.Mesh;
  private texture: THREE.VideoTexture;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, video: HTMLVideoElement) {
    this.scene = scene;
    this.texture = new THREE.VideoTexture(video);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ map: this.texture, depthWrite: false });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    // 最奥に配置 (renderOrder=-1)
    this.mesh.renderOrder = -1;
    this.mesh.visible = false;
  }

  show(): void { if (!this.mesh.parent) this.scene.add(this.mesh); this.mesh.visible = true; }
  hide(): void { this.mesh.visible = false; }
  dispose(): void {
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    (this.mesh.material as THREE.Material).dispose();
    this.texture.dispose();
  }
}
