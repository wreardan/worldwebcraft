var createGame = require('voxel-engine');
var texturePath = require('painterly-textures');
var voxel = require('voxel');

function cubeGenerator(x, y, z) {
  if (x*x + y*y + z*z > 20*20) return 0
  return Math.floor(Math.random() * 4) + 1
}

function sphereGenerator(x,y,z) {
    return x*x+y*y+z*z <= 20*20 ? 1 : 0 // sphere world
}

function flatGenerator(x,y,z) {
	return y === 1 ? 1 : 0;
}

var gameOptions = {
  texturePath: './textures/',
  generate: flatGenerator,
//  generate: sphereGenerator,
//  generate: voxel.generator['Valley'],
  materials: [['grass', 'dirt', 'grass_dirt'], 'brick', 'dirt'],
  materialFlatColor: false,
  chunkSize: 32,
  chunkDistance: 2,
  worldOrigin: [0, 0, 0],
  controls: { discreteFire: false },
  lightsDisabled: false,
  fogDisabled: false,
  generateChunks: true,
  mesher: voxel.meshers.greedy,
  playerHeight: 1.62
}

var game = createGame(gameOptions);
var container = document.body;
game.appendTo(container);

////player module
var createPlayer = require('voxel-player')(game);

var dude = createPlayer('dude.png');
dude.possess();

dude.yaw.position.set(0,40,0);

////perlin  noise
/*
var terrain = require('voxel-perlin-terrain');
var chunkSize = 32;

// initialize your noise with a seed, floor height, ceiling height and scale factor
var generateChunk = terrain('foo', 0, 5, 20);

// then hook it up to your game as such:

game.voxels.on('missingChunk', function(p) {
  var voxels = generateChunk(p, chunkSize);
  var chunk = {
    position: p,
    dims: [chunkSize, chunkSize, chunkSize],
    voxels: voxels
  };
  game.showChunk(chunk);
});
//*/
