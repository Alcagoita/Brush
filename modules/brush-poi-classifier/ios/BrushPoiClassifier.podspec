Pod::Spec.new do |s|
  s.name           = 'BrushPoiClassifier'
  s.version        = '0.1.0'
  s.summary        = 'On-device POI classifier for Brush (KAN-196)'
  s.description    = 'On-device LLM POI classification. iOS is a stub for now.'
  s.author         = ''
  s.homepage       = 'https://github.com/Alcagoita/Brush'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
