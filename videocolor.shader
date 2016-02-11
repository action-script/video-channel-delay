/*
 * author: Nuño de la Serna.
 * Copyrights licensed under the MIT License.
 * See the accompanying LICENSE file for terms.
*/

vertex:
   attribute vec3 vposition;
   uniform mat4 mproj;
   uniform mat4 mview;

   void main(void) {
      gl_Position = mproj * mview * vec4(vposition, 1.0);
   }

fragment:
   precision highp float;
   precision highp int;
   vec3 vcolor = vec3(0.8, 0.6, 1.0);
   void main() {
      gl_FragColor = vec4(vcolor, 1.0);
   }
