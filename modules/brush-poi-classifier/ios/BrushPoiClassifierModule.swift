import ExpoModulesCore

/**
 * BrushPoiClassifier — iOS stub (KAN-196).
 *
 * Apple Foundation Models are not wired up yet and do not run on the simulator,
 * so this reports unavailable and classification returns nil. The app falls back
 * to the rule-map (KAN-195). A future ticket can implement on-device inference
 * here behind the same surface without any JS changes.
 */
public class BrushPoiClassifierModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BrushPoiClassifier")

    AsyncFunction("isAvailable") { () -> Bool in
      return false
    }

    AsyncFunction("classify") { (_ title: String, _ allowed: [String], _ lang: String) -> String? in
      return nil
    }
  }
}
