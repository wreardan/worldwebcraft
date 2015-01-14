

var createGame = require('voxel-engine');

var radius = 2048;
var radius2 = radius * radius;
var radius12 = (radius - 1) * (radius - 1);

var earthSceneFlag = true;

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
  //make sure inputs are 0 <= x,y <= 1
  while(x < 0) x++;
  while(x > 1) x--;
  while(y < 0) y++;
  while(y > 1) y--;

  //convert from regular texture coordinates to image coordinates
  var tx = Math.floor(x * (earthCanvas.width-1) );
  var ty = Math.floor(y * (earthCanvas.height-1) );

  //capture pixel data from large array
  var index = (ty * earthCanvas.width + tx) * 4;
  var pixel = [];
  for(var i = 0; i < 4; i++)
    pixel[i] = pixelData[index + i];

  //get pixel from earth canvas
 // var pixel = earthCanvas.getContext('2d').getImageData(tx, ty, 1, 1).data;
  return pixel;
}

function texToVoxel(s, t) {
  //get pixel from image
  var pixel = getPixel(s, t); 

  //convert pixel value to voxel
  var r = pixel[0];
  var g = pixel[1];
  var b = pixel[2];
  var a = pixel[3];
  //    debugger; //debug pixel color -> voxel conversion

  //white = ice
  if(r > 200 && g > 200 && b > 200) return 2;
  //brown = dirt
  if(r > 100 && g > 100 && b > 100) return 3;
  //blue = water
  if(r < 100 && b > 100) return 4;
  //green = grass (default)
  return 1;
}

//unproject sphere, then turn image pixel data into voxel
function imageGenerator(x,y,z) {
  //determine if on sphere border
  var value = x*x + y*y + z*z;
  var below = value <= radius2;
  var above = value >= radius12;
  if(above && below) {
    //rotate coordinates by trackball quaternion
    webcraftVector.set(x,y,z);
    /*webcraftVector.x -= Math.PI / 2;
    if(webcraftVector.x > Math.PI * 2) webcraftVector.x -= Math.PI * 2;
    if(webcraftVector.x < 0) webcraftVector.x += Math.PI * 2;*/
    webcraftVector.applyQuaternion(webcraftRotation);
//    webcraftVector.applyEuler(webcraftRotation);
    x = webcraftVector.x;
    y = webcraftVector.y;
    z = webcraftVector.z;
    //convert to spherical coordinates
    var theta = Math.atan2(y,x);
    var phi = Math.acos(z/radius);

    //convert spherical to texture coordinates
    var s = (Math.sin(theta) + 1) / 2;
    var t = (Math.cos(phi) + 1) / 2;

    return texToVoxel(s, t);
  }
  //no voxel if not on sphere border
  return 0;
}

var projectionSize = 512;
function projectionGenerator(x,y,z) {
  if(y === 1) {
    while(x < 0) x += projectionSize;
    while(z < 0) z += projectionSize;
    var s = (x % projectionSize) / (projectionSize - 1);
    var t = (z % projectionSize) / (projectionSize - 1);
    return texToVoxel(s, t);
    return 1;
  }
  return 0;
}

var gameOptions = {
  texturePath: './textures/',
  generate: projectionGenerator,
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
  var container = document.getElementById("webcraftDiv");
  game.appendTo(container);

  ////player module
  var createPlayer = require('voxel-player')(game);

  var dude = createPlayer('./textures/dude.png');
  dude.possess();

//  dude.yaw.position.set(0,radius + 2,0);
  dude.yaw.position.set(0,0 + 2,0);

}

//load world image
var earthImage = new Image;
var earthCanvas = document.createElement("canvas");
var pixelData;

earthImage.onload = function() {
  earthCanvas.width = earthImage.width;
  earthCanvas.height = earthImage.height;
  earthCanvas.getContext('2d').drawImage(earthImage, 0, 0, earthImage.width, earthImage.height);
  pixelData = earthCanvas.getContext('2d').getImageData(0, 0, earthImage.width, earthImage.height).data;

  startGame();
}

webcraftInit = function() {
  earthImage.src = "./textures/earth_no_clouds_4k.jpg";
}

var THREE = require('three');

// Created by Bjorn Sandvik - thematicmapping.org
//https://github.com/turban/webgl-earth
earthInit = function () {

/** Trackball controls start
 * @author Eberhard Graether / http://egraether.com/
 */

THREE.TrackballControls = function ( object, domElement ) {

  var _this = this;
  var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5 };

  this.object = object;
  this.domElement = ( domElement !== undefined ) ? domElement : document;

  // API

  this.enabled = true;

  this.screen = { width: 0, height: 0, offsetLeft: 0, offsetTop: 0 };
  this.radius = ( this.screen.width + this.screen.height ) / 4;

  this.rotateSpeed = 0.5;
  this.zoomSpeed = 1.2;
  this.panSpeed = 0.3;

  this.noRotate = false;
  this.noZoom = false;
  this.noPan = false;

  this.staticMoving = true;
  this.dynamicDampingFactor = 0.2;

  this.minDistance = 0;
  this.maxDistance = Infinity;

  this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

  // internals

  this.target = new THREE.Vector3();

  var lastPosition = new THREE.Vector3();

  var _state = STATE.NONE,
  _prevState = STATE.NONE,

  _eye = new THREE.Vector3(),

  _rotateStart = new THREE.Vector3(),
  _rotateEnd = new THREE.Vector3(),

  _zoomStart = new THREE.Vector2(),
  _zoomEnd = new THREE.Vector2(),

  _touchZoomDistanceStart = 0,
  _touchZoomDistanceEnd = 0,

  _panStart = new THREE.Vector2(),
  _panEnd = new THREE.Vector2();

  // for reset

  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.up0 = this.object.up.clone();

  // events

  var changeEvent = { type: 'change' };


  // methods

  this.handleResize = function () {

    this.screen.width = window.innerWidth;
    this.screen.height = window.innerHeight;

    this.screen.offsetLeft = 0;
    this.screen.offsetTop = 0;

    this.radius = ( this.screen.width + this.screen.height ) / 4;

  };

  this.handleEvent = function ( event ) {

    if ( typeof this[ event.type ] == 'function' ) {

      this[ event.type ]( event );

    }

  };

  this.getMouseOnScreen = function ( clientX, clientY ) {

    return new THREE.Vector2(
      ( clientX - _this.screen.offsetLeft ) / _this.radius * 0.5,
      ( clientY - _this.screen.offsetTop ) / _this.radius * 0.5
    );

  };

  this.getMouseProjectionOnBall = function ( clientX, clientY ) {

    var mouseOnBall = new THREE.Vector3(
      ( clientX - _this.screen.width * 0.5 - _this.screen.offsetLeft ) / _this.radius,
      ( _this.screen.height * 0.5 + _this.screen.offsetTop - clientY ) / _this.radius,
      0.0
    );

    var length = mouseOnBall.length();

    if ( length > 1.0 ) {

      mouseOnBall.normalize();

    } else {

      mouseOnBall.z = Math.sqrt( 1.0 - length * length );

    }

    _eye.copy( _this.object.position ).sub( _this.target );

    var projection = _this.object.up.clone().setLength( mouseOnBall.y );
    projection.add( _this.object.up.clone().cross( _eye ).setLength( mouseOnBall.x ) );
    projection.add( _eye.setLength( mouseOnBall.z ) );

    return projection;

  };

  this.rotateCamera = function () {

    var angle = Math.acos( _rotateStart.dot( _rotateEnd ) / _rotateStart.length() / _rotateEnd.length() );

    if ( angle ) {

      var axis = ( new THREE.Vector3() ).crossVectors( _rotateStart, _rotateEnd ).normalize(),
        quaternion = new THREE.Quaternion();

      angle *= _this.rotateSpeed;

      quaternion.setFromAxisAngle( axis, -angle );

      _eye.applyQuaternion( quaternion );
      _this.object.up.applyQuaternion( quaternion );

      _rotateEnd.applyQuaternion( quaternion );

      if ( _this.staticMoving ) {

        _rotateStart.copy( _rotateEnd );

      } else {

        quaternion.setFromAxisAngle( axis, angle * ( _this.dynamicDampingFactor - 1.0 ) );
        _rotateStart.applyQuaternion( quaternion );

      }

    }

  };

  this.getRotation = function () {
/*
    //build quaternion
    var quat = new THREE.Quaternion();
    quat.setFromEuler(_rotateStart);
    //rotate to north pole

    var quatRot = new THREE.Quaternion();
    quatRot.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), Math.PI / 2 );
    quat.multiply(quatRot);
    return quat;
//*/
    return _rotateEnd;
  };

  this.getEye = function () {
    return _eye;
  };

  this.zoomCamera = function () {

    if ( _state === STATE.TOUCH_ZOOM ) {

      var factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
      _touchZoomDistanceStart = _touchZoomDistanceEnd;
      _eye.multiplyScalar( factor );

    } else {

      var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

      if ( factor !== 1.0 && factor > 0.0 ) {

        _eye.multiplyScalar( factor );

        if ( _this.staticMoving ) {

          _zoomStart.copy( _zoomEnd );

        } else {

          _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

        }

      }

    }

  };

  this.panCamera = function () {

    var mouseChange = _panEnd.clone().sub( _panStart );

    if ( mouseChange.lengthSq() ) {

      mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );

      var pan = _eye.clone().cross( _this.object.up ).setLength( mouseChange.x );
      pan.add( _this.object.up.clone().setLength( mouseChange.y ) );

      _this.object.position.add( pan );
      _this.target.add( pan );

      if ( _this.staticMoving ) {

        _panStart = _panEnd;

      } else {

        _panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

      }

    }

  };

  this.checkDistances = function () {

    if ( !_this.noZoom || !_this.noPan ) {

      if ( _this.object.position.lengthSq() > _this.maxDistance * _this.maxDistance ) {

        _this.object.position.setLength( _this.maxDistance );

      }

      if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {

        _this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );

      }

    }

  };

  this.update = function () {

    _eye.subVectors( _this.object.position, _this.target );

    if ( !_this.noRotate ) {

      _this.rotateCamera();

    }

    if ( !_this.noZoom ) {

      _this.zoomCamera();

    }

    if ( !_this.noPan ) {

      _this.panCamera();

    }

    _this.object.position.addVectors( _this.target, _eye );

    _this.checkDistances();

    _this.object.lookAt( _this.target );

    if ( lastPosition.distanceToSquared( _this.object.position ) > 0 ) {

      _this.dispatchEvent( changeEvent );

      lastPosition.copy( _this.object.position );

    }

  };

  this.reset = function () {

    _state = STATE.NONE;
    _prevState = STATE.NONE;

    _this.target.copy( _this.target0 );
    _this.object.position.copy( _this.position0 );
    _this.object.up.copy( _this.up0 );

    _eye.subVectors( _this.object.position, _this.target );

    _this.object.lookAt( _this.target );

    _this.dispatchEvent( changeEvent );

    lastPosition.copy( _this.object.position );

  };

  // listeners

  function keydown( event ) {

    if ( _this.enabled === false ) return;

    window.removeEventListener( 'keydown', keydown );

    _prevState = _state;

    if ( _state !== STATE.NONE ) {

      return;

    } else if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {

      _state = STATE.ROTATE;

    } else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {

      _state = STATE.ZOOM;

    } else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {

      _state = STATE.PAN;

    }

  }

  function keyup( event ) {

    if ( _this.enabled === false ) return;

    _state = _prevState;

    window.addEventListener( 'keydown', keydown, false );

  }

  function mousedown( event ) {

    if ( _this.enabled === false ) return;

    event.preventDefault();
    event.stopPropagation();

    if ( _state === STATE.NONE ) {

      _state = event.button;

    }

    if ( _state === STATE.ROTATE && !_this.noRotate ) {

      _rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );

    } else if ( _state === STATE.ZOOM && !_this.noZoom ) {

      _zoomStart = _zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );

    } else if ( _state === STATE.PAN && !_this.noPan ) {

      _panStart = _panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );

    }

    document.addEventListener( 'mousemove', mousemove, false );
    document.addEventListener( 'mouseup', mouseup, false );

  }

  function mousemove( event ) {

    if ( _this.enabled === false ) return;

    event.preventDefault();
    event.stopPropagation();

    if ( _state === STATE.ROTATE && !_this.noRotate ) {

      _rotateEnd = _this.getMouseProjectionOnBall( event.clientX, event.clientY );

    } else if ( _state === STATE.ZOOM && !_this.noZoom ) {

      _zoomEnd = _this.getMouseOnScreen( event.clientX, event.clientY );

    } else if ( _state === STATE.PAN && !_this.noPan ) {

      _panEnd = _this.getMouseOnScreen( event.clientX, event.clientY );

    }

  }

  function mouseup( event ) {

    if ( _this.enabled === false ) return;

    event.preventDefault();
    event.stopPropagation();

    _state = STATE.NONE;

    document.removeEventListener( 'mousemove', mousemove );
    document.removeEventListener( 'mouseup', mouseup );

  }

  function mousewheel( event ) {

    if ( _this.enabled === false ) return;

    event.preventDefault();
    event.stopPropagation();

    var delta = 0;

    if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

      delta = event.wheelDelta / 40;

    } else if ( event.detail ) { // Firefox

      delta = - event.detail / 3;

    }

    _zoomStart.y += delta * 0.01;

  }

  function touchstart( event ) {

    if ( _this.enabled === false ) return;

    switch ( event.touches.length ) {

      case 1:
        _state = STATE.TOUCH_ROTATE;
        _rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
        break;

      case 2:
        _state = STATE.TOUCH_ZOOM;
        var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
        var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
        _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );
        break;

      case 3:
        _state = STATE.TOUCH_PAN;
        _panStart = _panEnd = _this.getMouseOnScreen( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
        break;

      default:
        _state = STATE.NONE;

    }

  }

  function touchmove( event ) {

    if ( _this.enabled === false ) return;

    event.preventDefault();
    event.stopPropagation();

    switch ( event.touches.length ) {

      case 1:
        _rotateEnd = _this.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
        break;

      case 2:
        var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
        var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
        _touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy )
        break;

      case 3:
        _panEnd = _this.getMouseOnScreen( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
        break;

      default:
        _state = STATE.NONE;

    }

  }

  function touchend( event ) {

    if ( _this.enabled === false ) return;

    switch ( event.touches.length ) {

      case 1:
        _rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
        break;

      case 2:
        _touchZoomDistanceStart = _touchZoomDistanceEnd = 0;
        break;

      case 3:
        _panStart = _panEnd = _this.getMouseOnScreen( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
        break;

    }

    _state = STATE.NONE;

  }

  this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

  this.domElement.addEventListener( 'mousedown', mousedown, false );

  this.domElement.addEventListener( 'mousewheel', mousewheel, false );
  this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

  this.domElement.addEventListener( 'touchstart', touchstart, false );
  this.domElement.addEventListener( 'touchend', touchend, false );
  this.domElement.addEventListener( 'touchmove', touchmove, false );

  window.addEventListener( 'keydown', keydown, false );
  window.addEventListener( 'keyup', keyup, false );

  this.handleResize();

};

THREE.TrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );
//End Trackball Controls

//  var webglEl = document.getElementById('webgl');
  webglEl = document.createElement("webgl");
  document.getElementById('earthDiv').appendChild(webglEl);

/*
  if (!Detector.webgl) {
    Detector.addGetWebGLMessage(webglEl);
    return;
  }
*/
  var width  = window.innerWidth,
    height = window.innerHeight;

  // Earth params
  var radius   = 0.5,
    segments = 32,
    rotation = 0;  

  var scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
  camera.position.z = 1.5;

  var renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);

  scene.add(new THREE.AmbientLight(0x333333));

  var light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5,3,5);
  scene.add(light);

    var sphere = createSphere(radius, segments);
  sphere.rotation.y = rotation; 
  scene.add(sphere)

    var clouds = createClouds(radius, segments);
  clouds.rotation.y = rotation;
  scene.add(clouds)

  var stars = createStars(90, 64);
  scene.add(stars);

  trackballControl = new THREE.TrackballControls(camera);

  webglEl.appendChild(renderer.domElement);

  //Handle Keyboard Input
  function doKeyDown(e) {
    switch(e.keyCode) {
    case 13: //enter key
      earthSceneFlag = ! earthSceneFlag;

      //init webcraft if it hasn't already been
      if(! earthImage.src) {
        webcraftInit();
      }

      //hide the appropriate scene, show other
      if(earthSceneFlag) {
        webglEl.style.display="block";
        container.style.display="none";
      } else {
        //set rotation
        //http://lolengine.net/blog/2013/09/18/beautiful-maths-quaternion-from-vectors
        var shouldNormalize = false;
        if(shouldNormalize) {
          var eye = trackballControl.getEye();
          eye.normalize();
          var target = new THREE.Vector3(0,1,0);
          var w = eye.clone();
          w.cross(target);
          var x = 1 + eye.dot(target);
          webcraftRotation = new THREE.Quaternion(x, w.x, w.y, w.z);
          webcraftRotation.normalize();
        } else {
          //dont normalize
          var eye = trackballControl.getEye();
          var target = new THREE.Vector3(0,1.5,0);
          var w = eye.clone();
          w.cross(target);
          var x = 1 + eye.dot(target);
          webcraftRotation = new THREE.Quaternion(x, w.x, w.y, w.z);
        }
/*
        webcraftRotation.x += Math.PI / 2;
        if(webcraftRotation.x > Math.PI * 2) webcraftRotation.x -= Math.PI * 2;
        if(webcraftRotation.x < 0) webcraftRotation.x += Math.PI * 2;
*/
        webcraftVector = new THREE.Vector3(1,0,0);
        //show/hide
        webglEl.style.display="none";
        container.style.display="block";
      }

      break;
    case 87://W key, for + Ctrl= && e.ctrlKey
      break;
    case 70: //F key
      break;
    case 78://N key
      break;
    case 84://t key
      break;
    case 37: //left arrow
      break;
    case 39: //right arrow
      break;
    case 38: //up arrow
      break;
    case 40: //down arrow
      break;
    case 109: //subtract
      break;
    case 107: //add
      break;
    }
  }
  document.addEventListener("keydown", doKeyDown, true);

  render();

  function render() {
    if(earthSceneFlag) {
      trackballControl.update();
//      sphere.rotation.y += 0.0001;
//      clouds.rotation.y += 0.00011;    
      renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
  }

  function createSphere(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshPhongMaterial({
        map:         THREE.ImageUtils.loadTexture('textures/earth_no_clouds_4k.jpg'),
        bumpMap:     THREE.ImageUtils.loadTexture('textures/earth_elev_bump_4k.jpg'),
        bumpScale:   0.005,
        specularMap: THREE.ImageUtils.loadTexture('textures/earth_spec_4k.png'),
        specular:    new THREE.Color('grey')                
      })
    );
  }

  function createClouds(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius + 0.003, segments, segments),     
      new THREE.MeshPhongMaterial({
        map:         THREE.ImageUtils.loadTexture('textures/earth_fair_clouds_4k.png'),
        transparent: true
      })
    );    
  }

  function createStars(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments), 
      new THREE.MeshBasicMaterial({
        map:  THREE.ImageUtils.loadTexture('textures/galaxy_starfield.png'), 
        side: THREE.BackSide
      })
    );
  }

};