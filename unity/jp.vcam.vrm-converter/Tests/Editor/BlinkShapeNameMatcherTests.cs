using NUnit.Framework;
using VCam.VrmConverter.Expressions;

namespace VCam.VrmConverter.Tests
{
    public class BlinkShapeNameMatcherTests
    {
        [TestCase("Blink_L")]
        [TestCase("blink_l")]
        [TestCase("BlinkLeft")]
        [TestCase("eye_close_L")]
        [TestCase("Wink_L")]
        [TestCase("ウィンク")]
        [TestCase("まばたき左")]
        public void Find_LeftCandidates_AreMatched(string name)
        {
            var names = new[] { "vrc.v_aa", name, "Smile" };
            Assert.That(BlinkShapeNameMatcher.Find(names, BlinkSide.Left), Is.EqualTo(name));
        }

        [TestCase("Blink_R")]
        [TestCase("blink_r")]
        [TestCase("BlinkRight")]
        [TestCase("eye_close_R")]
        [TestCase("Wink_R")]
        [TestCase("ウィンク右")]
        [TestCase("まばたき右")]
        public void Find_RightCandidates_AreMatched(string name)
        {
            var names = new[] { "vrc.v_aa", name, "Smile" };
            Assert.That(BlinkShapeNameMatcher.Find(names, BlinkSide.Right), Is.EqualTo(name));
        }

        [Test]
        public void Find_LeftDoesNotMatchRightShape()
        {
            var names = new[] { "Blink_R" };
            Assert.That(BlinkShapeNameMatcher.Find(names, BlinkSide.Left), Is.Null);
        }

        [Test]
        public void Find_PrefersBlinkOverWink()
        {
            // パターン順 = 優先順。blink 系が wink 系より先に当たる
            var names = new[] { "Wink_L", "Blink_L" };
            Assert.That(BlinkShapeNameMatcher.Find(names, BlinkSide.Left), Is.EqualTo("Blink_L"));
        }

        [Test]
        public void Find_NoCandidate_ReturnsNull()
        {
            var names = new[] { "vrc.v_aa", "Smile", "Angry" };
            Assert.That(BlinkShapeNameMatcher.Find(names, BlinkSide.Left), Is.Null);
            Assert.That(BlinkShapeNameMatcher.Find(names, BlinkSide.Right), Is.Null);
        }

        [Test]
        public void Find_DoesNotMatchCombinedBlink()
        {
            // 両目まばたき "Blink" は片目用として誤検出しない
            var names = new[] { "Blink" };
            Assert.That(BlinkShapeNameMatcher.Find(names, BlinkSide.Left), Is.Null);
        }
    }
}
