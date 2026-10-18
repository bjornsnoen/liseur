package com.chmouel.liseur.ui.stats

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.chmouel.liseur.R
import com.chmouel.liseur.domain.StatsRange
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Both comparison paths state only the scope their arithmetic proves. */
@Config(sdk = [35], application = android.app.Application::class)
@RunWith(RobolectricTestRunner::class)
class ComparisonWordingTest {

    private val context: Context = ApplicationProvider.getApplicationContext()

    @Test
    fun `every comparison sentence says which device it counted`() {
        val sentences = listOf(
            context.getString(R.string.reading_stats_compare_more, 25, "last week"),
            context.getString(R.string.reading_stats_compare_less, 25, "last month"),
            context.getString(R.string.reading_stats_compare_more_than, "last year"),
            context.getString(R.string.reading_stats_compare_same, "last week"),
        )

        for (sentence in sentences) {
            assertTrue(sentence, sentence.contains("this device"))
        }
    }

    @Test
    fun `all-device comparison sentences need no second scope label`() {
        val sentences = listOf(
            context.getString(R.string.reading_stats_compare_more_all, 25, "last week"),
            context.getString(R.string.reading_stats_compare_less_all, 25, "last month"),
            context.getString(R.string.reading_stats_compare_more_than_all, "last year"),
            context.getString(R.string.reading_stats_compare_same_all, "last week"),
        )

        for (sentence in sentences) {
            assertFalse(sentence, sentence.contains("this device"))
        }
    }

    /**
     * And the line over the total names the devices it actually counted.
     *
     * The comparison beneath it is read against that line, so the line
     * must follow the provenance. It used to say "on every device" over
     * figures that had counted this one alone.
     */
    @Test
    fun `the line over the total names the devices it counted`() {
        for (range in StatsRange.entries) {
            val all = scopeText(range, StatsProvenance.ALL_DEVICES)
            assertTrue(all, all.contains("all your devices"))
            assertFalse(all, all.contains("this device"))

            val local = scopeText(range, StatsProvenance.THIS_DEVICE)
            assertTrue(local, local.contains("this device only"))
            assertFalse(local, local.contains("all your devices"))
        }
    }

    private fun scopeText(range: StatsRange, provenance: StatsProvenance): String {
        val line = scopeLine(range, provenance)
        return context.getString(
            R.string.reading_stats_joined,
            context.getString(line.range),
            context.getString(line.devices),
        )
    }
}
