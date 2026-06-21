'use strict';

/**
 * withShareExtension.js — KAN-164
 *
 * Custom Expo config plugin that wires the pure-Swift BrushShareExtension
 * into the Xcode project and Podfile during `npx expo prebuild`.
 *
 * expo-share-extension v5 was evaluated and rejected: it creates React Native
 * JS-bundle-based share extensions (requires index.share.js + Metro), which is
 * incompatible with our UIViewController + SwiftUI + direct Firebase approach.
 *
 * What this plugin does:
 *   1. withXcodeProject — adds BrushShareExtension as an app-extension target,
 *      adds the 4 Swift source files, wires Embed Foundation Extensions into
 *      the main Brush target, and configures all required build settings.
 *   2. withDangerousMod (Podfile) — adds the `target 'BrushShareExtension'`
 *      block with Firebase pod dependencies and the post_install hooks that
 *      create the compat prefix header and patch build settings.
 *
 * Both mods are idempotent: they check for existing content before mutating.
 */

const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ─── Constants ────────────────────────────────────────────────────────────────

const EXTENSION_NAME = 'BrushShareExtension';
const EXTENSION_BUNDLE_ID = 'com.brush.BrushShareExtension';
const SOURCE_FILES = [
  'ShareViewController.swift',
  'ParseResult.swift',
  'CloudFunctions.swift',
  'ConfirmationView.swift',
];
const ENTITLEMENTS_FILE = 'BrushShareExtension.entitlements';

// ─── 1. Xcode project mod ─────────────────────────────────────────────────────

function withShareExtensionXcode(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;

    // Idempotency: skip if target already exists
    const existingTargets = project.pbxNativeTargetSection();
    const alreadyExists = Object.values(existingTargets).some(
      (t) => t && t.name === EXTENSION_NAME,
    );
    if (alreadyExists) {
      console.log(`[withShareExtension] Target "${EXTENSION_NAME}" already present — skipping.`);
      return config;
    }

    const targetUuid = project.generateUuid();
    const deploymentTarget = config.ios?.deploymentTarget || '16.4';

    // ── Build configurations ───────────────────────────────────────────────

    const commonSettings = {
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_ENTITLEMENTS: `${EXTENSION_NAME}/${ENTITLEMENTS_FILE}`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: '"1"',
      DEVELOPMENT_TEAM: '""',
      ENABLE_USER_SCRIPT_SANDBOXING: 'NO',
      GCC_PRECOMPILE_PREFIX_HEADER: 'YES',
      GCC_PREFIX_HEADER: '"$(PODS_ROOT)/BrushShareExtCompat-prefix.h"',
      GENERATE_INFOPLIST_FILE: 'YES',
      INFOPLIST_FILE: `${EXTENSION_NAME}/Info.plist`,
      INFOPLIST_KEY_CFBundleDisplayName: EXTENSION_NAME,
      IPHONEOS_DEPLOYMENT_TARGET: `"${deploymentTarget}"`,
      LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: '"1.0"',
      PRODUCT_BUNDLE_IDENTIFIER: `"${EXTENSION_BUNDLE_ID}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SKIP_INSTALL: 'YES',
      SWIFT_EMIT_LOC_STRINGS: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '1',
    };

    const buildConfigurationsList = [
      {
        name: 'Debug',
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ...commonSettings,
          DEBUG_INFORMATION_FORMAT: 'dwarf',
          MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE',
          SWIFT_ACTIVE_COMPILATION_CONDITIONS: 'DEBUG',
          SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
        },
      },
      {
        name: 'Release',
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ...commonSettings,
          COPY_PHASE_STRIP: 'NO',
          DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
          SWIFT_COMPILATION_MODE: 'wholemodule',
        },
      },
    ];

    const xcConfigList = project.addXCConfigurationList(
      buildConfigurationsList,
      'Release',
      `Build configuration list for PBXNativeTarget "${EXTENSION_NAME}"`,
    );

    // ── Product file ───────────────────────────────────────────────────────

    const productFile = project.addProductFile(EXTENSION_NAME, {
      group: 'Copy Files',
      explicitFileType: 'wrapper.app-extension',
    });
    project.addToPbxBuildFileSection(productFile);

    // ── PBXNativeTarget ────────────────────────────────────────────────────

    const target = {
      uuid: targetUuid,
      pbxNativeTarget: {
        isa: 'PBXNativeTarget',
        name: EXTENSION_NAME,
        productName: EXTENSION_NAME,
        productReference: productFile.fileRef,
        productType: '"com.apple.product-type.app-extension"',
        buildConfigurationList: xcConfigList.uuid,
        buildPhases: [],
        buildRules: [],
        dependencies: [],
      },
    };
    project.addToPbxNativeTargetSection(target);

    // ── Add target to PBXProject + TargetAttributes ────────────────────────

    project.addToPbxProjectSection(target);

    const projectSection = project.pbxProjectSection();
    const projectUuid = project.getFirstProject().uuid;
    if (projectSection[projectUuid]) {
      const attrs = projectSection[projectUuid].attributes || {};
      if (!attrs.TargetAttributes) attrs.TargetAttributes = {};
      attrs.TargetAttributes[targetUuid] = { LastSwiftMigration: 1250 };
      projectSection[projectUuid].attributes = attrs;
    }

    // ── Target dependency: Brush → BrushShareExtension ────────────────────

    if (!project.hash.project.objects['PBXTargetDependency']) {
      project.hash.project.objects['PBXTargetDependency'] = {};
    }
    if (!project.hash.project.objects['PBXContainerItemProxy']) {
      project.hash.project.objects['PBXContainerItemProxy'] = {};
    }
    project.addTargetDependency(project.getFirstTarget().uuid, [targetUuid]);

    // ── PBX group with source files ────────────────────────────────────────

    const allFiles = [...SOURCE_FILES, 'Info.plist', ENTITLEMENTS_FILE];
    const { uuid: pbxGroupUuid } = project.addPbxGroup(
      allFiles,
      EXTENSION_NAME,
      EXTENSION_NAME,
    );

    // Attach group to the root project group
    const groups = project.hash.project.objects['PBXGroup'];
    Object.keys(groups).forEach((key) => {
      if (key.endsWith('_comment')) return;
      const g = groups[key];
      if (g && g.name === undefined && g.path === undefined) {
        project.addToPbxGroup(pbxGroupUuid, key);
      }
    });

    // ── Build phases ───────────────────────────────────────────────────────

    // Sources — explicitly list 4 Swift files
    project.addBuildPhase(
      SOURCE_FILES,
      'PBXSourcesBuildPhase',
      'Sources',
      targetUuid,
      'app_extension',
    );

    // Frameworks — CocoaPods fills this with Pods_BrushShareExtension.framework
    project.addBuildPhase(
      [],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      targetUuid,
      'app_extension',
    );

    // Resources
    project.addBuildPhase(
      [],
      'PBXResourcesBuildPhase',
      'Resources',
      targetUuid,
      'app_extension',
    );

    // Embed Foundation Extensions — on the MAIN Brush target.
    // We can't use addToPbxCopyfilesBuildPhase: it only finds phases named
    // 'Copy Files', not 'Embed Foundation Extensions'. Build manually instead.
    const embedPhaseUuid = project.generateUuid();
    const embedBuildFileUuid = project.generateUuid();

    project.hash.project.objects['PBXBuildFile'][embedBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productFile.fileRef,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    project.hash.project.objects['PBXBuildFile'][`${embedBuildFileUuid}_comment`] =
      `${EXTENSION_NAME}.appex in Embed Foundation Extensions`;

    if (!project.hash.project.objects['PBXCopyFilesBuildPhase']) {
      project.hash.project.objects['PBXCopyFilesBuildPhase'] = {};
    }
    project.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '""',
      dstSubfolderSpec: 13,
      files: [
        { value: embedBuildFileUuid, comment: `${EXTENSION_NAME}.appex in Embed Foundation Extensions` },
      ],
      name: '"Embed Foundation Extensions"',
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects['PBXCopyFilesBuildPhase'][`${embedPhaseUuid}_comment`] =
      'Embed Foundation Extensions';

    const mainTargetObj =
      project.hash.project.objects['PBXNativeTarget'][project.getFirstTarget().uuid];
    mainTargetObj.buildPhases.push({
      value: embedPhaseUuid,
      comment: 'Embed Foundation Extensions',
    });

    return config;
  });
}

// ─── 2. Podfile mod ───────────────────────────────────────────────────────────

const PODFILE_TARGET_TAG = '# [withShareExtension] BrushShareExtension target';
const PODFILE_HOOK_TAG = '# [withShareExtension] BrushShareExtension post_install';

const PODFILE_TARGET_BLOCK = `${PODFILE_TARGET_TAG}
target 'BrushShareExtension' do
  pod 'FirebaseCore'
  pod 'FirebaseAuth'
  pod 'FirebaseFirestore'
  pod 'FirebaseFunctions'
end`;

const PODFILE_HOOK_BLOCK = `    ${PODFILE_HOOK_TAG}
    share_ext_prefix = "#{installer.sandbox.root}/BrushShareExtCompat-prefix.h"
    File.write(share_ext_prefix, <<~HDR)
      // Auto-generated by withShareExtension config plugin.
      #ifdef __OBJC__
      #import <SafariServices/SafariServices.h>
      #import <WebKit/WebKit.h>
      #import <FirebaseCore/FirebaseCore.h>
      #endif
    HDR

    begin
      main_proj = Xcodeproj::Project.open("#{installer.sandbox.root}/../Brush.xcodeproj")
      main_proj.targets.each do |target|
        next unless target.name == 'BrushShareExtension'
        target.build_configurations.each do |cfg|
          cfg.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
          cfg.build_settings['GCC_PREFIX_HEADER']             = '$(PODS_ROOT)/BrushShareExtCompat-prefix.h'
          cfg.build_settings['GCC_PRECOMPILE_PREFIX_HEADER']  = 'YES'
        end
      end
      main_proj.save
    rescue => e
      warn "[post_install] Failed to patch BrushShareExtension build settings: #{e.message}"
    end`;

function withShareExtensionPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile',
      );
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // ── Add target block (before `target 'Brush' do`) ─────────────────

      if (!podfile.includes(PODFILE_TARGET_TAG)) {
        podfile = podfile.replace(
          /^(target 'Brush' do)/m,
          `${PODFILE_TARGET_BLOCK}\n\n$1`,
        );
      }

      // ── Add post_install hook (inside existing post_install block) ─────

      if (!podfile.includes(PODFILE_HOOK_TAG)) {
        // Insert after react_native_post_install(...) call block
        podfile = podfile.replace(
          /(react_native_post_install\([^)]+\))/,
          `$1\n\n${PODFILE_HOOK_BLOCK}`,
        );
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

module.exports = (config) => {
  config = withShareExtensionXcode(config);
  config = withShareExtensionPodfile(config);
  return config;
};
