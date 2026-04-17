import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

export type VRMLoadResult = {
  vrm: VRM;
  displayName: string;
  versionLabel: string;
};

/**
 * VRM ファイルを URL から読み込む。
 * シーンへの追加は呼出側の責任 (vrm.scene を追加する)。
 */
export async function loadVRMFromUrl(url: string): Promise<VRMLoadResult> {
  const gltf = await loader.loadAsync(url);
  const vrm: VRM | undefined = (gltf.userData as { vrm?: VRM }).vrm;
  if (!vrm) throw new Error('VRM データが見つかりません (not a VRM file?)');

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false;
  });
  VRMUtils.rotateVRM0(vrm); // VRM 0.x の前後補正 (VRM 1.0 は no-op)

  const meta = vrm.meta as { name?: string; title?: string; metaVersion?: string } | undefined;
  const displayName = meta?.name ?? meta?.title ?? '(無題)';
  const versionLabel = meta?.metaVersion ?? (meta ? '0.x' : '?');
  return { vrm, displayName, versionLabel };
}

/**
 * 現在の VRM をシーンから外しリソース解放する。
 * 新しい VRM に差し替える前に呼ぶ。
 */
export function disposeVRM(scene: THREE.Scene, vrm: VRM): void {
  scene.remove(vrm.scene);
  VRMUtils.deepDispose(vrm.scene);
}
