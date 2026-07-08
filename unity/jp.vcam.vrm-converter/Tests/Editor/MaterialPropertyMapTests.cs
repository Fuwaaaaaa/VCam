using NUnit.Framework;
using UnityEngine;
using VCam.VrmConverter.Materials;

namespace VCam.VrmConverter.Tests
{
    /// <summary>
    /// lilToon → MToon の値変換 (pure 関数) のテスト。
    /// Material/Shader を介する分岐は手動 QA (docs/qa/VRM_CONVERTER_QA.md) でカバーする。
    /// </summary>
    public class MaterialPropertyMapTests
    {
        [TestCase(0.5f, 0f)]    // 既定の境界 → 中央
        [TestCase(0f, -1f)]     // 影なし方向
        [TestCase(1f, 1f)]      // 全面影方向
        public void ShadeShiftFromShadowBorder(float border, float expected)
        {
            Assert.That(MToonValueMap.ShadeShiftFromShadowBorder(border), Is.EqualTo(expected).Within(1e-5f));
        }

        [Test]
        public void ShadeShift_IsClampedToValidRange()
        {
            Assert.That(MToonValueMap.ShadeShiftFromShadowBorder(2f), Is.EqualTo(1f));
            Assert.That(MToonValueMap.ShadeShiftFromShadowBorder(-1f), Is.EqualTo(-1f));
        }

        [TestCase(0f, 1f)]      // ぼかしなし → くっきり (toony 最大)
        [TestCase(1f, 0f)]      // 全ぼかし → toony 最小
        [TestCase(0.25f, 0.75f)]
        public void ShadeToonyFromShadowBlur(float blur, float expected)
        {
            Assert.That(MToonValueMap.ShadeToonyFromShadowBlur(blur), Is.EqualTo(expected).Within(1e-5f));
        }

        [Test]
        public void ShadeColorFallback_Darkens25PercentKeepingAlpha()
        {
            var main = new Color(1f, 0.8f, 0.4f, 0.9f);
            var shade = MToonValueMap.ShadeColorFallback(main);
            Assert.That(shade.r, Is.EqualTo(0.75f).Within(1e-5f));
            Assert.That(shade.g, Is.EqualTo(0.6f).Within(1e-5f));
            Assert.That(shade.b, Is.EqualTo(0.3f).Within(1e-5f));
            Assert.That(shade.a, Is.EqualTo(0.9f).Within(1e-5f));
        }

        [TestCase(0.5f, 0f)]
        [TestCase(1f, 0.5f)]
        [TestCase(0f, 0f)] // 0.5 未満は 0 に clamp
        public void RimLiftFromRimBorder(float border, float expected)
        {
            Assert.That(MToonValueMap.RimLiftFromRimBorder(border), Is.EqualTo(expected).Within(1e-5f));
        }

        [Test]
        public void EmissionColor_ScalesByBlend()
        {
            var result = MToonValueMap.EmissionColor(new Color(2f, 1f, 0f, 1f), 0.5f);
            Assert.That(result.r, Is.EqualTo(1f).Within(1e-5f));
            Assert.That(result.g, Is.EqualTo(0.5f).Within(1e-5f));
            Assert.That(result.b, Is.EqualTo(0f).Within(1e-5f));
        }

        [Test]
        public void EmissionColor_BlendIsClamped()
        {
            var result = MToonValueMap.EmissionColor(Color.white, 5f);
            Assert.That(result.r, Is.EqualTo(1f).Within(1e-5f));
        }
    }
}
