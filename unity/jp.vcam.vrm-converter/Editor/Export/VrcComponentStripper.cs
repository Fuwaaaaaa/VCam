using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace VCam.VrmConverter.Export
{
    /// <summary>
    /// 複製アバターから VRChat 関連コンポーネント・EditorOnly オブジェクト・
    /// Missing Script を取り除く。型ではなく名前空間 ("VRC") で判定するため、
    /// PhysBone / Contact / Constraint / PipelineManager 等を SDK 参照なしで一掃できる。
    /// 必ず PhysBone → SpringBone 変換の後に実行すること。
    /// </summary>
    public static class VrcComponentStripper
    {
        public static void Strip(GameObject avatar)
        {
            RemoveEditorOnlyObjects(avatar);
            RemoveMissingScripts(avatar);
            RemoveVrcComponents(avatar);
        }

        private static void RemoveEditorOnlyObjects(GameObject avatar)
        {
            var doomed = new List<GameObject>();
            foreach (var t in avatar.GetComponentsInChildren<Transform>(true))
            {
                if (t.gameObject != avatar && t.gameObject.CompareTag("EditorOnly"))
                {
                    doomed.Add(t.gameObject);
                }
            }
            foreach (var go in doomed)
            {
                if (go != null)
                {
                    Object.DestroyImmediate(go);
                }
            }
        }

        private static void RemoveMissingScripts(GameObject avatar)
        {
            foreach (var t in avatar.GetComponentsInChildren<Transform>(true))
            {
                GameObjectUtility.RemoveMonoBehavioursWithMissingScript(t.gameObject);
            }
        }

        private static void RemoveVrcComponents(GameObject avatar)
        {
            // RequireComponent の依存関係で削除に失敗することがあるため、
            // 消えなくなるまで複数パスで繰り返す
            for (var pass = 0; pass < 8; pass++)
            {
                var removed = 0;
                foreach (var component in avatar.GetComponentsInChildren<Component>(true))
                {
                    if (component == null || component is Transform)
                    {
                        continue;
                    }
                    var ns = component.GetType().Namespace ?? "";
                    if (!ns.StartsWith("VRC"))
                    {
                        continue;
                    }
                    try
                    {
                        Object.DestroyImmediate(component);
                        removed++;
                    }
                    catch
                    {
                        // 依存元が残っている間は失敗する → 次パスで再試行
                    }
                }
                if (removed == 0)
                {
                    break;
                }
            }
        }
    }
}
