using NUnit.Framework;
using VCam.VrmConverter.Expressions;

namespace VCam.VrmConverter.Tests
{
    public class VisemeMapTests
    {
        [Test]
        public void EnumOrder_MatchesVrcSdkIndices()
        {
            // VRC.SDKBase.VRC_AvatarDescriptor.Viseme と同順であることが前提
            Assert.That((int)VrcViseme.Sil, Is.EqualTo(0));
            Assert.That((int)VrcViseme.Aa, Is.EqualTo(10));
            Assert.That((int)VrcViseme.E, Is.EqualTo(11));
            Assert.That((int)VrcViseme.Ih, Is.EqualTo(12));
            Assert.That((int)VrcViseme.Oh, Is.EqualTo(13));
            Assert.That((int)VrcViseme.Ou, Is.EqualTo(14));
        }

        [Test]
        public void Table_MapsExactlyFiveVowels()
        {
            Assert.That(VisemeMap.Table.Count, Is.EqualTo(5));
            Assert.That(VisemeMap.Table[VrcViseme.Aa], Is.EqualTo(VrmVowel.A));
            Assert.That(VisemeMap.Table[VrcViseme.Ih], Is.EqualTo(VrmVowel.I));
            Assert.That(VisemeMap.Table[VrcViseme.Ou], Is.EqualTo(VrmVowel.U));
            Assert.That(VisemeMap.Table[VrcViseme.E], Is.EqualTo(VrmVowel.E));
            Assert.That(VisemeMap.Table[VrcViseme.Oh], Is.EqualTo(VrmVowel.O));
        }

        [TestCase(10, VrmVowel.A)]
        [TestCase(11, VrmVowel.E)]
        [TestCase(12, VrmVowel.I)]
        [TestCase(13, VrmVowel.O)]
        [TestCase(14, VrmVowel.U)]
        public void TryGetVowel_VowelIndices_ReturnsTrue(int index, VrmVowel expected)
        {
            Assert.That(VisemeMap.TryGetVowel(index, out var vowel), Is.True);
            Assert.That(vowel, Is.EqualTo(expected));
        }

        [TestCase(0)]  // sil
        [TestCase(1)]  // PP
        [TestCase(9)]  // RR
        public void TryGetVowel_ConsonantIndices_ReturnsFalse(int index)
        {
            Assert.That(VisemeMap.TryGetVowel(index, out _), Is.False);
        }

        [TestCase(-1)]
        [TestCase(15)]
        public void TryGetVowel_OutOfRange_ReturnsFalse(int index)
        {
            Assert.That(VisemeMap.TryGetVowel(index, out _), Is.False);
        }
    }
}
