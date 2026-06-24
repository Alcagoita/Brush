// Manual mock — there is no TFLite native runtime under Jest. loadTensorflowModel
// rejects, so classifyPoi (src/services/poiLlm.ts) degrades to null and any code
// that runs POI inference (e.g. the import connectors) falls back to the rule map
// only. Tests that need real model output mock this module explicitly with their
// own factory (see __tests__/services/poiLlm.test.ts).
module.exports = {
  loadTensorflowModel: jest.fn(() => Promise.reject(new Error('tflite unavailable in tests'))),
};
