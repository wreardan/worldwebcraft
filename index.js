

var createGame = require('voxel-engine');

var radius = 512;
var radius2 = radius * radius;
var radius12 = (radius - 1) * (radius - 1);

function cubeGenerator(x, y, z) {
  if (x*x + y*y + z*z > 20*20) return 0;
  return Math.floor(Math.random() * gameOptions.length) + 1;
}

function sphereGenerator(x,y,z) {
  var value = x*x + y*y + z*z;
  var below = value <= radius2;
  var above = value >= radius12;
  if(above && below) {
    return Math.floor(Math.random() * 4) + 1;
  }
  return 0;
}

function flatGenerator(x,y,z) {
	return y === 1 ? 1 : 0;
}

var getPixel = function(x,y) {
  //wrap negative values
  while(x < 0) x++;
  while(y < 0) y++;
  //convert from regular texture coordinates to image coordinates
  var tx = Math.floor(x * earthCanvas.width);
  var ty = Math.floor(y * earthCanvas.height);
  //get pixel from earth canvas
  var pixelData = earthCanvas.getContext('2d').getImageData(tx, ty, 1, 1).data;
  return pixelData;
}

//unproject sphere, then turn image pixel data into voxel
function imageGenerator(x,y,z) {
  //
  var value = x*x + y*y + z*z;
  var below = value <= radius2;
  var above = value >= radius12;
  if(above && below) {
    //convert to spherical coordinates
    //var theta = Math.atan(y/x);
    var theta = Math.atan2(y,x);
    var phi = Math.acos(z/radius);
    //convert spherical to texture coordinates

    var s = (Math.sin(theta) + 1) / 2;
    var t = (Math.cos(phi) + 1) / 2;
    //get pixel from image
    var pixel = getPixel(t, s); 
    //convert pixel value to voxel
    var r = pixel[0];
    var g = pixel[1];
    var b = pixel[2];
    var a = pixel[3];
    debugger;
    //white = ice
    if(r > 200 && g > 200 && b > 200) return 2;
    //brown = dirt
    if(r > 100 && g > 100 && b > 100) return 3;
    //blue = water
    if(r < 100 && b > 100) return 4;
    //green = grass (default)
    return 1;
  }
  return 0;
}

var gameOptions = {
  texturePath: './textures/',
  generate: imageGenerator,
  materials: [['grass', 'dirt', 'grass_dirt'], 'ice', 'dirt', 'bluewool'],
  generateChunks: true,
  chunkSize: 32,
  chunkDistance: 2,
}
var game;

var startGame = function() {

  game = createGame(gameOptions);

  //explode voxels
  game.on('mousedown', function(pos) {
    console.log(pos);
    console.log("mouse clicked");
  });

  game.on('onmouseup', function(pos) {
    console.log(pos);
    console.log("mouse clicked");
  });
/*
  game.on('tick', function(delta) {
    console.log('tick')
  })
*/
  //add to dom
  var container = document.body;
  game.appendTo(container);

  ////player module
  var createPlayer = require('voxel-player')(game);

  var dude = createPlayer('./textures/dude.png');
  dude.possess();

  dude.yaw.position.set(0,radius + 2,0);
}

//load world image
var earthImage = new Image;
var earthCanvas = document.createElement("canvas");
earthImage.onload = function() {
  earthCanvas.width = earthImage.width;
  earthCanvas.height = earthImage.height;
  earthCanvas.getContext('2d').drawImage(earthImage, 0, 0, earthImage.width, earthImage.height);

  startGame();
}
earthImage.src = "./textures/earth_no_clouds_4k.jpg";