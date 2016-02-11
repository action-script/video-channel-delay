/*
 * Author Nuño de la Serna.
 * Copyrights licensed under the MIT License.
 * See the accompanying LICENSE file for terms.
*/
var configuration = {
   fps: 60,
   resolution: 2,
   intensity: 1,              // 0 - 1
   channels: 'RGB',           // R | B | G
   orientation: 'horizontal', // horizontal | vertical
   direction: 'forward'       // back |forward
};
var graph = {
   resources: {},
   lines: []
};
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
      $.when(
         // get shader by ajax request
         $.get( '/videocolor.shader', (function( data ) {
            console.log('reicived shader source');
            graph.resources.shader_source = data;
         }).bind(this))
      ).done(callback);
   },

   initGeometry: function() {
      graph.colorShader = new GLApp.Shader(graph.resources.shader_source);
   }

};

GLApp.Shader = function(source) {
   this.attrib_locations = {};
   this.uniform_locations = {};
   var shaders = this.preprocess(source);
   this.create(shaders);

};
GLApp.Shader.prototype = {
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

      var directives =`
         #ifdef GL_FRAGMENT_PRECISION_HIGH\n
         precision highp int;\n
         precision highp float;\n
         #else\n
         precision mediump int;\n
         precision mediump float;\n
         #endif\n\n`;

      // set the shader source cod
      gl.shaderSource(shader, directives + source);

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
               shaders[current] += '#line ' + i + '\n' + line + '\n';
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
               throw ('could not compile shader:' + gl.getShaderInfoLog(object) );
         }
         else
            throw ('Not shader or program');
      }
   },
   getAttribLocation: function(name){
      var attrib_location = this.attrib_locations[name];
      if(attrib_location === undefined){
         var attrib_location = this.attrib_locations[name] = gl.getAttribLocation(this.program, name);
      }
      return attrib_location;
   },
   getUniformLocation: function(name){
      var uniform_location = this.uniform_locations[name];
      if(uniform_location === undefined){
         var uniform_location = this.uniform_locations[name] = gl.getUniformLocation(this.program, name);
      }
      return uniform_location;
   }

}

var Line = function(options){ this.init(options || {}); };

$('document').ready(function(){
   /* download resources */
   GLApp.downloadResources( function() {
      GLApp.init();
      GLApp.initGeometry();
   });

});
