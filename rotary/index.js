var gl;

var density = 2712;
var densityAluminum = 2712;
var densityPlastic = 1040;
var densitySteel = 7850;

var torque = 0;
var shape = "circle";
var radius = 0.06;
var height = 0.01;
var refreshRate = 10;
var zSpeed = 0.0;
var material = "aluminum";

var texture = "aluminum.gif";
var aluminumTexture = "aluminum.gif";
var steelTexture = "steel.gif";
var plasticTexture = "plastic.gif";

function initGL(canvas)
{
    gl = canvas.getContext("webgl") ||
	     canvas.getContext("experimental-webgl") ||
	     canvas.getContext("moz-webgl") ||
	     canvas.getContext("webkit-3d");

    if (gl)
    {
    	var extensions = gl.getSupportedExtensions();

		console.log( gl );
		console.log( extensions );

		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;

		gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
    }
    else
    	console.log("Your browser doesn't support OpenGL.");
}

function getShader(gl, id)
{
	var shaderScript = document.getElementById(id);
	if (!shaderScript)
		return null;
	
  	var str = "";
  	var k = shaderScript.firstChild;
  	while(k)
  	{
  		if (k.nodeType == 3)
  			str += k.textContent;
  		
  		k = k.nextSibling;
  	}
  	
  	var shader;
  	
 	if(shaderScript.type == "x-shader/x-fragment")
 		shader = gl.createShader(gl.FRAGMENT_SHADER);
    else if (shaderScript.type == "x-shader/x-vertex")
     	shader = gl.createShader(gl.VERTEX_SHADER);
    else
       	return null;

 	gl.shaderSource(shader, str);
  	gl.compileShader(shader);
  	
   	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
   	{
    	alert(gl.getShaderInfoLog(shader));
      	return null;
 	}
	return shader;
}
    var shaderProgram;
    function initShaders() {
        var fragmentShader = getShader(gl, "shader-fs");
        var vertexShader = getShader(gl, "shader-vs");
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }
        gl.useProgram(shaderProgram);
        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
        shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
        shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
    }
    function handleLoadedTexture(texture) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    var moonTexture;
    
function initTexture()
{
	moonTexture = gl.createTexture();
	moonTexture.image = new Image();
	moonTexture.image.onload = function(){handleLoadedTexture(moonTexture)}
	moonTexture.image.src = texture;
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix()
{
   	var copy = mat4.create();
   	mat4.set(mvMatrix, copy);
 	mvMatrixStack.push(copy);
}

function mvPopMatrix()
{
  	if(mvMatrixStack.length == 0)
       	throw "Invalid popMatrix!";

	mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms()
{
  	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
   	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
   	var normalMatrix = mat3.create();
 	mat4.toInverseMat3(mvMatrix, normalMatrix);
   	mat3.transpose(normalMatrix);
   	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function degToRad(degrees)
{
        return degrees * (Math.PI / 180);
}

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
//var timeMouseDown = 0;
var moonRotationMatrix = mat4.create();

mat4.identity(moonRotationMatrix);

function handleMouseDown(event)
{
	zSpeed = 0;
	//timeMouseDown = Date.now();
  	mouseDown = true;
 	lastMouseX = event.clientX;
 	lastMouseY = event.clientY;
}

function handleMouseUp(event)
{
   	mouseDown = false;
}
    
function handleMouseMove(event)
{
	if(!mouseDown)
		return;
	
  	var newX = event.clientX;
  	var newY = event.clientY;
   	var deltaX = newX - lastMouseX;
   	var newRotationMatrix = mat4.create();
 	mat4.identity(newRotationMatrix);
  	mat4.rotate(newRotationMatrix, degToRad(deltaX / 10), [0, 1, 0]);
  	var deltaY = newY - lastMouseY;
 	mat4.rotate(newRotationMatrix, degToRad(deltaY / 10), [1, 0, 0]);
  	mat4.multiply(newRotationMatrix, moonRotationMatrix, moonRotationMatrix);

  	//var deltaD = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
	//var deltaT = (Date.now() - timeMouseDown) * (refreshRate / 1000);
  	//zSpeed = -1 * degToRad(deltaD) / deltaT;
  	
  	lastMouseX = newX
 	lastMouseY = newY;
}
    
var moonVertexPositionBuffer;
var moonVertexNormalBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexIndexBuffer;
    
var vertexBufferCylinderSide;
var vertexBufferCylinderTop;
var vertexBufferCylinderBot;
    
function initCircleBuffers()
{
        var latitudeBands = 32;
        var longitudeBands = 32;
        radius = document.getElementById("radius").value;
        var vertexPositionData = [];
        var normalData = [];
        var textureCoordData = [];
        for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
            var theta = latNumber * Math.PI / latitudeBands;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
            for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
                var phi = longNumber * 2 * Math.PI / longitudeBands;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);
                var x = cosPhi * sinTheta;
                var y = cosTheta;
                var z = sinPhi * sinTheta;
                var u = 1 - (longNumber / longitudeBands);
                var v = 1 - (latNumber / latitudeBands);
                normalData.push(x);
                normalData.push(y);
                normalData.push(z);
                textureCoordData.push(u);
                textureCoordData.push(v);
                vertexPositionData.push(metersToPixels(radius) * x);
                vertexPositionData.push(metersToPixels(radius) * y);
                vertexPositionData.push(metersToPixels(radius) * z);
            }
        }
        var indexData = [];
        for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
            for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
                var first = (latNumber * (longitudeBands + 1)) + longNumber;
                var second = first + longitudeBands + 1;
                indexData.push(first);
                indexData.push(second);
                indexData.push(first + 1);
                indexData.push(second);
                indexData.push(second + 1);
                indexData.push(first + 1);
            }
        }
        moonVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
        moonVertexNormalBuffer.itemSize = 3;
        moonVertexNormalBuffer.numItems = normalData.length / 3;
        moonVertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
        moonVertexTextureCoordBuffer.itemSize = 2;
        moonVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;
        moonVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
        moonVertexPositionBuffer.itemSize = 3;
        moonVertexPositionBuffer.numItems = vertexPositionData.length / 3;
        moonVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
        moonVertexIndexBuffer.itemSize = 1;
        moonVertexIndexBuffer.numItems = indexData.length;
    }

function initDiskBuffers()
{
	var slices = 32;
	var cylinderSideVertices = [];
	var cylinderTopVertices = [];
	var cylinderBotVertices = [];
	
	for(var slice = 0; slice <= slices; slice++)
	{
		var x = Math.cos((slice * Math.PI) / (2 * slices));
		var y = Math.sin((slice * Math.PI) / (2 * slices));
		
		cylinderBotVertices.push(x, y, z);
		cylinderSideVertices.push(x, y, z);
		cylinderSideVertices.push(x, y+1, z);
		cylinderTopVertices.push(x, y+1, z);		
	}
	
	var cylinderBotArray = new Float32Array(cylinderBotVertices);
	var cylinderSideArray = new Float32Array(cylinderSideVertices);
	var cylinderTopArray = new Float32Array(cylinderTopVertices);

	vertexBufferCylinderTop = gl.createBuffer();
	   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderTop);
	   gl.bufferData(gl.ARRAY_BUFFER, cylinderTopArray, gl.STATIC_DRAW);
	   vertexBufferCylinderTop.nmbrOfVertices = cylinderTopArray.length/7;
	   gl.bindBuffer(gl.ARRAY_BUFFER, null);

	   vertexBufferCylinderBot = gl.createBuffer();
	   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderBot);
	   gl.bufferData(gl.ARRAY_BUFFER, cylinderBotArray, gl.STATIC_DRAW);
	   vertexBufferCylinderBot.nmbrOfVerticess = cylinderBotArray.length/7; //xyz + rgba = 7
	   gl.bindBuffer(gl.ARRAY_BUFFER, null);

	   vertexBufferCylinderSide = gl.createBuffer();
	   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferCylinderSide);
	   gl.bufferData(gl.ARRAY_BUFFER, cylinderSideArray, gl.STATIC_DRAW);
	   vertexBufferCylinderSide.nmbrOfVertices = cylinderSideArray.length / 7; //xyz + rgba = 7
	   gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function metersToPixels(value)
{
	return ((value * 4017) / 255);
}

function pixelsToMeters(value)
{
	return 255 / (value * 4017);
}
    
function getValue(value)
{
	if(value === "inertia")
		return (2 / 5) * getValue("mass") * Math.pow(radius, 2);
	else if(value === "mass")
		return density * getValue("volume");
	else if(value === "volume")
		return (4 / 3) * Math.PI * Math.pow(radius, 3);
	else if(value === "KE")
		return (1 / 2) * getValue("inertia") * Math.pow((zSpeed * (1000/refreshRate)),2);
	else if(value === "AM")
		return getValue("inertia") * (zSpeed * (1000/refreshRate));
}

function tRound(value, power)
{
	return Math.round(value * Math.pow(10, power)) / Math.pow(10, power);
}
    
function drawScene()
{
	if(document.getElementById("radius").value != radius)
		initCircleBuffers();
	
	if(document.getElementById("material").value != material)
	{
		material = document.getElementById("material").value;
		switch(material)
		{
		case "aluminum":
			texture = aluminumTexture;
			density = densityAluminum;
			break;
		case "steel":
			texture = steelTexture;
			density = densitySteel;
			break;
		case "plastic":
			texture = plasticTexture;
			density = densityPlastic;
			break;
		}
		initTexture();
	}
	
 	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
 	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
  	var lighting = document.getElementById("lighting").checked;
 	gl.uniform1i(shaderProgram.useLightingUniform, lighting);
   	if (lighting) {
            gl.uniform3f(
                shaderProgram.ambientColorUniform,
                parseFloat(document.getElementById("ambientR").value),
                parseFloat(document.getElementById("ambientG").value),
                parseFloat(document.getElementById("ambientB").value)
            );
            var lightingDirection = [
                parseFloat(document.getElementById("lightDirectionX").value),
                parseFloat(document.getElementById("lightDirectionY").value),
                parseFloat(document.getElementById("lightDirectionZ").value)
            ];
            var adjustedLD = vec3.create();
            vec3.normalize(lightingDirection, adjustedLD);
            vec3.scale(adjustedLD, -1);
            gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);
            gl.uniform3f(
                shaderProgram.directionalColorUniform,
                parseFloat(document.getElementById("directionalR").value),
                parseFloat(document.getElementById("directionalG").value),
                parseFloat(document.getElementById("directionalB").value)
            );
        }
   		if(shape == "circle")
   		{
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [0, 0, -2.5]);
        mat4.multiply(mvMatrix, moonRotationMatrix);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, moonTexture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, moonVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, moonVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, moonVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLE_STRIP, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
   		}
   		else if(shape == "disk")
   		{
   			
   		}

        var newRotationMatrix = mat4.create();
        mat4.identity(newRotationMatrix);
        zSpeed = degToRad(document.getElementById("zSpeed").value) * (refreshRate / 1000);
        mat4.rotate(newRotationMatrix, zSpeed, [0.0, 0.0, 1.0]);
        mat4.multiply(newRotationMatrix, moonRotationMatrix, moonRotationMatrix);

        document.getElementById("inertia").innerHTML = "Moment of Inertia: " + tRound(getValue("inertia"), 6) + " kg*m^2";
        document.getElementById("mass").innerHTML = "Mass: " + tRound(getValue("mass"), 4) + " kg";
        document.getElementById("AM").innerHTML = "Angular Momentum: " + tRound(getValue("AM"), 7) + " N*m*s";
        document.getElementById("velo").innerHTML = "Angular Velocity: " + tRound((zSpeed * (1000/refreshRate)), 4) + " rad/s";
        document.getElementById("KE").innerHTML = "Kinetic Energy: " + tRound(getValue("KE"), 9) + " J";
}

function tick()
{
	while((Date.now() % refreshRate) != 0){}
	
	requestAnimFrame(tick);
	drawScene();
}

var DateStart = Date.now();

function webGLStart()
{
	var canvas = document.getElementById("rotary-motion");
  	initGL(canvas);
  	initShaders();
  	initCircleBuffers();
 	initTexture();
   	gl.clearColor(0.0, 0.0, 0.0, 1.0);
 	gl.enable(gl.DEPTH_TEST);
 	canvas.onmousedown = handleMouseDown;
  	document.onmouseup = handleMouseUp;
   	document.onmousemove = handleMouseMove;
   	tick();
}
