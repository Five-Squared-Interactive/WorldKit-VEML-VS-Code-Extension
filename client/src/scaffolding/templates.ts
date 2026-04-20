/**
 * Scaffold template definitions for WorldKit project creation.
 * Each template is a set of files with content that can include {{projectName}} placeholders.
 */

export interface ScaffoldFile {
  readonly relativePath: string;
  readonly content: string;
}

export interface ScaffoldTemplate {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly detail: string;
  readonly files: readonly ScaffoldFile[];
}

const VSCODE_SETTINGS = JSON.stringify(
  {
    'files.associations': { '*.veml': 'veml' },
  },
  null,
  2,
);

export const MINIMAL_TEMPLATE: ScaffoldTemplate = {
  id: 'minimal',
  label: 'Minimal World',
  description: 'A single world file with environment — the simplest starting point',
  detail: '3 files: world.veml, .vemlproject, .vscode/settings.json',
  files: [
    { relativePath: '.vemlproject', content: '' },
    { relativePath: '.vscode/settings.json', content: VSCODE_SETTINGS },
    {
      relativePath: 'world.veml',
      content: [
        '<veml>',
        '  <metadata>',
        '    <title>{{projectName}}</title>',
        '  </metadata>',
        '  <environment>',
        '    <background>',
        '      <lite-procedural-sky />',
        '    </background>',
        '  </environment>',
        '</veml>',
      ].join('\n'),
    },
  ],
};

export const INTERACTIVE_TEMPLATE: ScaffoldTemplate = {
  id: 'interactive',
  label: 'Interactive World',
  description: 'A world with a player character, ground, light, and example script',
  detail: '4 files: world.veml, scripts/player-controller.js, .vemlproject, .vscode/settings.json',
  files: [
    { relativePath: '.vemlproject', content: '' },
    { relativePath: '.vscode/settings.json', content: VSCODE_SETTINGS },
    {
      relativePath: 'world.veml',
      content: [
        '<veml>',
        '  <metadata>',
        '    <title>{{projectName}}</title>',
        '    <script src="scripts/player-controller.js" />',
        '  </metadata>',
        '  <environment>',
        '    <background>',
        '      <lite-procedural-sky top-color="#87CEEB" horizon-color="#E0E8F0" bottom-color="#8B7355" />',
        '    </background>',
        '    <character id="player" tag="player">',
        '      <scaletransform>',
        '        <position x="0" y="1" z="0" />',
        '        <rotation x="0" y="0" z="0" w="1" />',
        '      </scaletransform>',
        '    </character>',
        '    <mesh id="ground" src="ground.glb" static="true">',
        '      <scaletransform>',
        '        <position x="0" y="0" z="0" />',
        '        <scale x="10" y="1" z="10" />',
        '      </scaletransform>',
        '    </mesh>',
        '    <light id="sun" type="directional" intensity="1" color="#FFFFFF">',
        '      <scaletransform>',
        '        <position x="0" y="10" z="0" />',
        '      </scaletransform>',
        '    </light>',
        '  </environment>',
        '</veml>',
      ].join('\n'),
    },
    {
      relativePath: 'scripts/player-controller.js',
      content: [
        '// Player controller script stub',
        '// Replace this with your player movement logic',
        '//',
        '// Available APIs:',
        '//   entity.transform.position - get/set position',
        '//   entity.transform.rotation - get/set rotation',
        '//   input.getAxis("horizontal") - left/right input',
        '//   input.getAxis("vertical") - forward/back input',
        '',
        'export function onUpdate(entity, dt) {',
        '  // TODO: Implement player movement',
        '}',
      ].join('\n'),
    },
  ],
};

export const MULTI_ROOM_TEMPLATE: ScaffoldTemplate = {
  id: 'multi-room',
  label: 'Multi-Room World',
  description: 'Multiple scene files with a lobby and room — demonstrates multi-file projects',
  detail: '5 files: lobby.veml, room-1.veml, scripts/door-trigger.js, .vemlproject, .vscode/settings.json',
  files: [
    { relativePath: '.vemlproject', content: '' },
    { relativePath: '.vscode/settings.json', content: VSCODE_SETTINGS },
    {
      relativePath: 'lobby.veml',
      content: [
        '<veml>',
        '  <metadata>',
        '    <title>{{projectName}} - Lobby</title>',
        '    <script src="scripts/door-trigger.js" />',
        '  </metadata>',
        '  <environment>',
        '    <background>',
        '      <lite-procedural-sky />',
        '    </background>',
        '    <container id="spawn-point">',
        '      <scaletransform>',
        '        <position x="0" y="0" z="0" />',
        '      </scaletransform>',
        '    </container>',
        '    <container id="door-to-room-1" tag="door">',
        '      <scaletransform>',
        '        <position x="5" y="1" z="0" />',
        '      </scaletransform>',
        '    </container>',
        '    <light id="lobby-light" type="directional" intensity="1" />',
        '  </environment>',
        '</veml>',
      ].join('\n'),
    },
    {
      relativePath: 'room-1.veml',
      content: [
        '<veml>',
        '  <metadata>',
        '    <title>{{projectName}} - Room 1</title>',
        '    <script src="scripts/door-trigger.js" />',
        '  </metadata>',
        '  <environment>',
        '    <background>',
        '      <color r="0.1" g="0.1" b="0.18" />',
        '    </background>',
        '    <light id="room-light" type="point" intensity="2" color="#FFD700" range="15">',
        '      <scaletransform>',
        '        <position x="0" y="3" z="0" />',
        '      </scaletransform>',
        '    </light>',
        '    <container id="door-to-lobby" tag="door">',
        '      <scaletransform>',
        '        <position x="-5" y="1" z="0" />',
        '      </scaletransform>',
        '    </container>',
        '  </environment>',
        '</veml>',
      ].join('\n'),
    },
    {
      relativePath: 'scripts/door-trigger.js',
      content: [
        '// Door trigger script stub',
        '// Transitions to another scene when the player enters the trigger zone',
        '//',
        '// Available APIs:',
        '//   entity.onTriggerEnter(callback) - called when another entity enters',
        '//   world.loadScene(scenePath) - load a different scene file',
        '',
        'export function onReady(entity) {',
        '  // TODO: Set up trigger enter handler',
        '  // entity.onTriggerEnter(() => {',
        '  //   world.loadScene("room-1.veml");',
        '  // });',
        '}',
      ].join('\n'),
    },
  ],
};

export const PLUGIN_TEST_TEMPLATE: ScaffoldTemplate = {
  id: 'plugin-test',
  label: 'Plugin Test Project',
  description: 'A WorldOS plugin project with test world — for plugin development',
  detail: '4 files: test-world.veml, plugin.json, .vemlproject, .vscode/settings.json',
  files: [
    { relativePath: '.vemlproject', content: '' },
    { relativePath: '.vscode/settings.json', content: VSCODE_SETTINGS },
    {
      relativePath: 'plugin.json',
      content: JSON.stringify(
        {
          name: '{{projectName}}',
          type: 'wos-plugin',
          version: '0.1.0',
          description: 'A WorldOS plugin project',
        },
        null,
        2,
      ),
    },
    {
      relativePath: 'test-world.veml',
      content: [
        '<veml>',
        '  <metadata>',
        '    <title>{{projectName}} - Test</title>',
        '  </metadata>',
        '  <environment>',
        '    <background>',
        '      <lite-procedural-sky />',
        '    </background>',
        '    <mesh id="test-entity" src="test.glb">',
        '      <scaletransform>',
        '        <position x="0" y="0" z="0" />',
        '      </scaletransform>',
        '    </mesh>',
        '  </environment>',
        '</veml>',
      ].join('\n'),
    },
  ],
};

/** All available scaffold templates. */
export const ALL_TEMPLATES: readonly ScaffoldTemplate[] = [
  MINIMAL_TEMPLATE,
  INTERACTIVE_TEMPLATE,
  MULTI_ROOM_TEMPLATE,
  PLUGIN_TEST_TEMPLATE,
];
