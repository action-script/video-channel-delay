/*
 * Author Nuño de la Serna.
 * Copyrights licensed under the MIT License.
 * See the accompanying LICENSE file for terms.
*/
var configuration = {
   fps: 30,
   video_speed: 1.0,
   resolution: 2,
   channels: 'RGB',             // R | B | G | RGB
   orientation: 'horizontal', // horizontal | vertical
   video_name: 'video1_min.mp4'
};
var graph = {
   resources: {},
   textures: [],
   lines: []
};
// stats
var stats = new Stats();
// GL helper static functions
var GLApp = {
   init: function(options) {
      // create canvas and get context
      var canvas = $('<canvas/>', {'id':'canvas'});
      $('body').prepend( canvas );

      this.canvas = canvas[0];
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.getContext();

   },

   getContext: function() {
      var context_names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
      for (i in context_names) {
         try {
            this.gl = this.canvas.getContext(context_names[i]);
            return null;
         }
         catch (error) {
            console.log('error canvas context', context_names[i]);
         }
      }
   },

   downloadResources: function(callback) {
      function loadImage(name,url) {
         var deferred = $.Deferred();

         var image = new Image();
         image.onload = function() {
            graph.resources[name] = image;
            deferred.resolve();
         }
         image.src = url;

         return deferred.promise();
      }
      function loadVideo(name, url) {
         var deferred = $.Deferred();

         var video = document.createElement('video');
         video.onloadeddata = function() {
            graph.resources[name] = video;
            deferred.resolve();
         }
         
         video.preload = 'auto';
         video.loop = true;
         video.src = url;

         video.style.display = 'none';
         document.body.appendChild(video);

         return deferred.promise();
      }
      $.when(
         // get shader by ajax request
         $.get( '/videocolor.shader', (function( data ) {
               graph.resources.shader_source = data;
            }).bind(this)
         ),
         // get html5 video
         loadVideo( 'video', '/assets/'+configuration.video_name )
      ).done(callback);
   },

   initGeometry: function() {
      /* shader */
      graph.colorShader = new GLApp.Shader(graph.resources.shader_source);

      /* line rows */
      var total_size =
         configuration.orientation == 'horizontal' ? GLApp.canvas.height : GLApp.canvas.width;
      var number_of_lines = Math.floor(total_size / configuration.resolution);
      var line_size = 2 / number_of_lines;

      for (var i = 0; i < number_of_lines; i++) {
         graph.lines.push( new Line({id: i, size: line_size }) );
         graph.textures.push( new GLApp.Texture({source: graph.resources.video}) );
      }

      graph.number_of_lines = number_of_lines;

      // display stats
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.left = '0px';
      stats.domElement.style.top = '0px';

      document.body.appendChild( stats.domElement );
   },

   initRender: function() {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);

      gl.viewport( 0, 0, GLApp.canvas.width, GLApp.canvas.height );

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      // pass config to shaders
      graph.colorShader.use();
      graph.colorShader.uniform(
         'vresolution',
         [GLApp.canvas.width, GLApp.canvas.height]
      );
      var value = 0;
      value = configuration.channels.indexOf('R') > -1 ? 1 : 0;
      graph.colorShader.uniform('channels.R', value);
      value = configuration.channels.indexOf('G') > -1 ? 1 : 0;
      graph.colorShader.uniform('channels.G', value);
      value = configuration.channels.indexOf('B') > -1 ? 1 : 0;
      graph.colorShader.uniform('channels.B', value);

      // start play movie
      graph.resources.video.play();
      graph.resources.video.playbackRate = configuration.video_speed;

      this.frameCount = 0;
      // draw loop
      this.drawLoopId = setInterval((function(){
         this.frameCount++;
         this.render();
      }).bind(this), 1000 / configuration.fps);
   },

   render: function() {
      stats.begin();

      // image base
      graph.textures[graph.number_of_lines-1].use(0);
      graph.colorShader.uniform('simage_base', 0);

      for (var i in graph.lines) {
         this.drawLine( parseInt(i) );
      }

      // get new video frame texture
      var removed_texture = graph.textures.shift();
      // update instead of destroy
      removed_texture.update( graph.resources.video );
      graph.textures.push( removed_texture );

      stats.end();
   },

   drawLine: function(id) {
      // image over
      graph.textures[graph.number_of_lines-1-id].use(1);
      graph.colorShader.uniform('simage_over', 1);

      graph.lines[id].draw();
   }

};

GLApp.Shader = function(source) { this.init(source || {}); };

GLApp.Shader.prototype = {
   init: function(source) {
      this.attrib_locations = {};
      this.uniform_locations = {};
      var shaders = this.preprocess(source);
      this.create(shaders);
   },

   create: function(shaders) {
      gl = GLApp.gl;

      // create program and shaders
      this.program = gl.createProgram();
      this.vertex = gl.createShader(gl.VERTEX_SHADER);
      this.fragment = gl.createShader(gl.FRAGMENT_SHADER);

      // load sources and compile
      this.compile( this.vertex, shaders.vertex );
      this.compile( this.fragment, shaders.fragment );

      // attach shaders to program
      gl.attachShader( this.program, this.vertex );
      gl.attachShader( this.program, this.fragment );

      // link program
      gl.linkProgram( this.program );

      this.checkShaderError(this.program, true);
   },

   destroy: function() {
      gl = GLApp.gl;
      var shaders = gl.getAttachedShaders(this.program);
      gl.detachShader(this.program, shaders[0]);
      gl.detachShader(this.program, shaders[1]);
      gl.deleteShader(shaders[0]);
      gl.deleteShader(shaders[1]);
      gl.deleteProgram(this.program);
   },

   compile: function(shader, source) {
      gl = GLApp.gl;

      var directives = [
         '#ifdef GL_FRAGMENT_PRECISION_HIGH',
         'precision highp int;',
         'precision highp float;',
         '#else',
         'precision mediump int;',
         'precision mediump float;',
         '#endif'
      ];

      // set the shader source cod
      gl.shaderSource(shader, directives.join('\n') + source);

      // compile the shader
      gl.compileShader(shader);

      // check if it compiled
      this.checkShaderError(shader);
   },

   preprocess: function(source) {
      lines = source.split('\n');
      var shaders = {};
      var current;

      var line;
      for(i in lines) {
         line = lines[i];
         var type = line.match(/^(\w+):/);
         if(type) {
            current = type[1];
            shaders[current] = '';
         }
         else{
            if(current){
               //shaders[current] += '#line ' + i + '\n' + line + '\n';
               shaders[current] += line + '\n';
            }
         }
      }
      return shaders;
   },

   checkShaderError: function(object, program ) {
      if (program == null) {
         program = false;
      }
      gl = GLApp.gl;
      var success;

      if ( program && gl.isProgram(object) ) {
         success = gl.getProgramParameter(object, gl.LINK_STATUS);
         if (!success)
            throw ('Linking program error' + gl.getProgramInfoLog(object) );
      }
      else {
         if ( gl.isShader(object) ) {
            success = gl.getShaderParameter(object, gl.COMPILE_STATUS);
            if (!success)
               throw ('could not compile shader\n' + gl.getShaderInfoLog(object) );
         }
         else
            throw ('Not shader or program');
      }
   },

   getAttribLocation: function(name) {
      var attrib_location = this.attrib_locations[name];
      if(attrib_location === undefined){
         var attrib_location = this.attrib_locations[name] = gl.getAttribLocation(this.program, name);
      }
      return attrib_location;
   },

   getUniformLocation: function(name) {
      var uniform_location = this.uniform_locations[name];
      if (uniform_location === undefined) {
         var uniform_location = this.uniform_locations[name] = gl.getUniformLocation(this.program, name);
      }
      return uniform_location;
   },

   uniform: function(name, value) {
      var uniform_location = this.getUniformLocation(name);
      if (value.type == 'Mat4') {
         gl.uniformMatrix4fv(uniform_location, false, value.data);
      }
      else if (value.type == 'Mat3') {
         gl.uniformMatrix3fv(uniform_location, false, value.data);
      }
      else if (value.type == 'Vec3') {
         gl.uniform3f(uniform_location, value.x, value.y, value.z);
      }
      else if (typeof(value) == 'number') {
         if (isInt(value))
            gl.uniform1i(uniform_location, value);
         else if (isFloat(value))
            gl.uniform1f(uniform_location, value);
      }
      else if (typeof(value) == 'object') {
         gl['uniform' + value.length + 'fv'](uniform_location, value);
      }
   },

   use: function() {
      GLApp.gl.useProgram(this.program);
   }

}

GLApp.VBO = function(options){ this.init(options || {}); };

GLApp.VBO.prototype = {
   init(options) {
      this.buffers = [];

      this.buffers[0] = {};
      this.buffers[0].data = options.vertex;
      this.buffers[0].size = 3;

      if (options.texcoord != undefined) {
         this.buffers[1] = {};
         this.buffers[1].data = options.texcoord;
         this.buffers[1].size = 2;
      }

      for (i in this.buffers)
         this.addVBO(i);
      
   },

   addVBO(id) {
      var gl = GLApp.gl;

      // generate and bind the buffer object
      this.buffers[id].vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[id].vbo);
      gl.bufferData(gl.ARRAY_BUFFER,
         new Float32Array(this.buffers[id].data),
         gl.STATIC_DRAW
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, null); // unbinding

   },

   setUpAttribPointer: function(id) {
      var gl = GLApp.gl;
      gl.enableVertexAttribArray(id);
      gl.vertexAttribPointer(
         id,
         this.buffers[id].size,
         gl.FLOAT,
         false,
         0,
         0
      );
   },

   draw: function() {
      var gl = GLApp.gl;

      // bind all the vbo streams
      for (i in this.buffers) {
         buffer = this.buffers[i];
         gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vbo);
         this.setUpAttribPointer(i);
      }

      gl.drawArrays(gl.TRIANGLES, 0, this.buffers[0].data.length / this.buffers[0].size);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);
   }

};

GLApp.Texture = function(options) { this.init(options || {}); };

GLApp.Texture.prototype = {
   init: function(options) {
      if (options.source != null)
         this.createFromSource(options.source)
   },

   createFromSource: function(source_img) {
      gl = GLApp.gl;

      this.texture = gl.createTexture();

      gl.bindTexture( gl.TEXTURE_2D, this.texture );
      gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source_img );
      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

      // unbind
      gl.bindTexture(gl.TEXTURE_2D, null);
   },

   update: function(source_img) {
      gl = GLApp.gl;

      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source_img);
      // unbind
      gl.bindTexture(gl.TEXTURE_2D, null);
},

   use: function(id) {
      if (id == null) id = 0;
      gl = GLApp.gl;

      gl.activeTexture(gl['TEXTURE'+id]);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
   },

   destroy: function() {
      GLApp.gl.deleteTexture(this.texture);
   }
};

var Line = function(options){ this.init(options || {}); };

Line.prototype = {
   init: function(options) {
      this.id = options.id;
      this.size = options.size;
      this.createGeometry();
   },

   createGeometry: function() {
      var p = {
         top: 1 - this.size*this.id,
         rigth: 1,
         bottom: 1 - this.size*(this.id+1),
         left: -1
      };
      if (configuration.orientation == 'vertical')
         p = {
            top: p.left,
            rigth: p.bottom,
            bottom: p.rigth,
            left: p.top
         };

      var vertices = [
         p.left,  p.top,    0,
         p.left,  p.bottom, 0,
         p.rigth, p.bottom, 0,
         
         p.left,  p.top,    0,
         p.rigth, p.bottom, 0,
         p.rigth, p.top,    0
      ];


      this.vbo = new GLApp.VBO({ vertex: vertices });
   },

   draw: function(){
      this.vbo.draw();
   }
};

$('document').ready(function(){
   /* download resources */
   GLApp.downloadResources( function() {
      GLApp.init();
      GLApp.initGeometry();
      GLApp.initRender();
   });

});

/* helper */

function isInt(n) {
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}
