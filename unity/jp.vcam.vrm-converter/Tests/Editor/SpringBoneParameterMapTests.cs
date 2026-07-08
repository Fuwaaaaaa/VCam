using NUnit.Framework;
using VCam.VrmConverter.Dynamics;

namespace VCam.VrmConverter.Tests
{
    public class SpringBoneParameterMapTests
    {
        private static readonly SpringBoneMapSettings Default = SpringBoneMapSettings.Default;

        private static PhysBoneParams Params(
            float pull = 0f, float spring = 0f, float gravity = 0f, float immobile = 0f,
            float radius = 0f, bool world = false, bool hasLimit = false, float limitAngle = 180f)
        {
            return new PhysBoneParams
            {
                Pull = pull,
                Spring = spring,
                Gravity = gravity,
                Immobile = immobile,
                Radius = radius,
                ImmobileWorld = world,
                HasLimit = hasLimit,
                LimitAngle = limitAngle,
            };
        }

        [Test]
        public void Pull0_StiffnessIsZero()
        {
            var result = SpringBoneParameterMap.Map(Params(pull: 0f), Default);
            Assert.That(result.Stiffness, Is.EqualTo(0f));
            Assert.That(result.Skip, Is.False);
        }

        [Test]
        public void Pull1_StiffnessIsFour()
        {
            var result = SpringBoneParameterMap.Map(Params(pull: 1f), Default);
            Assert.That(result.Stiffness, Is.EqualTo(4f).Within(1e-5f));
        }

        [Test]
        public void StiffnessIsClampedToFour()
        {
            // pull*4 + immobile が 4 を超えても clamp される
            var result = SpringBoneParameterMap.Map(Params(pull: 1f, immobile: 1f), Default);
            Assert.That(result.Stiffness, Is.EqualTo(4f));
        }

        [Test]
        public void Spring_PassesThroughToDrag()
        {
            var result = SpringBoneParameterMap.Map(Params(spring: 0.3f), Default);
            Assert.That(result.Drag, Is.EqualTo(0.3f).Within(1e-5f));
        }

        [Test]
        public void InvertSpring_FlipsDrag()
        {
            var settings = Default;
            settings.InvertSpring = true;
            var result = SpringBoneParameterMap.Map(Params(spring: 0.3f), settings);
            Assert.That(result.Drag, Is.EqualTo(0.7f).Within(1e-5f));
        }

        [Test]
        public void DragIsClampedToOne()
        {
            var result = SpringBoneParameterMap.Map(Params(spring: 0.8f, immobile: 0.8f), Default);
            Assert.That(result.Drag, Is.EqualTo(1f));
        }

        [Test]
        public void Immobile_AddsToStiffnessAndDrag()
        {
            var result = SpringBoneParameterMap.Map(Params(pull: 0.25f, spring: 0.1f, immobile: 0.5f), Default);
            Assert.That(result.Stiffness, Is.EqualTo(0.25f * 4f + 0.5f).Within(1e-5f));
            Assert.That(result.Drag, Is.EqualTo(0.1f + 0.5f).Within(1e-5f));
        }

        [Test]
        public void LimitAngleZero_Skips()
        {
            var result = SpringBoneParameterMap.Map(Params(pull: 1f, hasLimit: true, limitAngle: 0f), Default);
            Assert.That(result.Skip, Is.True);
        }

        [Test]
        public void LimitAngle90_HalvesStiffnessAndDrag()
        {
            var result = SpringBoneParameterMap.Map(
                Params(pull: 0.5f, spring: 0.6f, hasLimit: true, limitAngle: 90f), Default);
            Assert.That(result.Stiffness, Is.EqualTo(0.5f * 4f * 0.5f).Within(1e-5f));
            Assert.That(result.Drag, Is.EqualTo(0.6f * 0.5f).Within(1e-5f));
        }

        [Test]
        public void LimitAngle180_HasNoEffect()
        {
            var with = SpringBoneParameterMap.Map(Params(pull: 0.5f, hasLimit: true, limitAngle: 180f), Default);
            var without = SpringBoneParameterMap.Map(Params(pull: 0.5f), Default);
            Assert.That(with.Stiffness, Is.EqualTo(without.Stiffness).Within(1e-5f));
        }

        [Test]
        public void Gravity_ScalesByFactor()
        {
            var result = SpringBoneParameterMap.Map(Params(gravity: 0.05f), Default);
            Assert.That(result.GravityPower, Is.EqualTo(1f).Within(1e-5f));
        }

        [Test]
        public void NegativeGravity_ClampsToZero()
        {
            var result = SpringBoneParameterMap.Map(Params(gravity: -0.5f), Default);
            Assert.That(result.GravityPower, Is.EqualTo(0f));
        }

        [Test]
        public void Radius_PassesThroughToHitRadius()
        {
            var result = SpringBoneParameterMap.Map(Params(radius: 0.07f), Default);
            Assert.That(result.HitRadius, Is.EqualTo(0.07f).Within(1e-5f));
        }
    }
}
