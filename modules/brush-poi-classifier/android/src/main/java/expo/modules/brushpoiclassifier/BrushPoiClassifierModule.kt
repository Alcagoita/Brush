package expo.modules.brushpoiclassifier

import android.content.Context
import com.google.ai.edge.aicore.GenerativeModel
import com.google.ai.edge.aicore.generationConfig
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

/**
 * BrushPoiClassifier — on-device POI classification via Gemini Nano (AICore). KAN-196.
 *
 * Exposes two async functions to JS (see src/services/poiLlm.ts):
 *   isAvailable(): Boolean — true only when AICore/Gemini Nano is ready on this device.
 *   classify(title, allowed, lang): String? — one allowed label, or null.
 *
 * Everything is defensive: any failure (unsupported device, model not downloaded,
 * inference error, timeout) resolves to false/null. The module never throws into JS,
 * so the rule-map fallback (KAN-195) always remains intact.
 */
class BrushPoiClassifierModule : Module() {

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private var model: GenerativeModel? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  /** Lazily build (and cache) a deterministic, short-output model for classification. */
  private fun model(): GenerativeModel {
    return model ?: GenerativeModel(
      generationConfig = generationConfig {
        this.context = this@BrushPoiClassifierModule.context.applicationContext
        temperature = 0.0f
        topK = 1
        maxOutputTokens = 8
      }
    ).also { model = it }
  }

  override fun definition() = ModuleDefinition {
    Name("BrushPoiClassifier")

    AsyncFunction("isAvailable") { promise: Promise ->
      scope.launch {
        val available = try {
          // prepareInferenceEngine() succeeds only when AICore + the model are ready.
          model().prepareInferenceEngine()
          true
        } catch (t: Throwable) {
          false
        }
        promise.resolve(available)
      }
    }

    AsyncFunction("classify") { title: String, allowed: List<String>, lang: String, promise: Promise ->
      scope.launch {
        val label = try {
          withTimeoutOrNull(TIMEOUT_MS) {
            model().generateContent(buildPrompt(title, allowed, lang)).text?.trim()
          }
        } catch (t: Throwable) {
          null
        }
        // JS re-validates against the allowed set; we just forward the raw label.
        promise.resolve(label)
      }
    }
  }

  private fun buildPrompt(title: String, allowed: List<String>, lang: String): String {
    val options = allowed.joinToString(", ")
    return """
      You categorize a to-do task by the single most relevant place type to visit.
      Allowed labels: $options, none.
      Rules: reply with exactly ONE label from the list, lowercase, nothing else.
      If no place type clearly fits, reply: none.
      Task language: $lang
      Task: "$title"
      Label:
    """.trimIndent()
  }

  companion object {
    private const val TIMEOUT_MS = 4_000L
  }
}
